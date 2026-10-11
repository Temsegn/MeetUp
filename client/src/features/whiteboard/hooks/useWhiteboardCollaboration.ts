import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { CaptureUpdateAction, reconcileElements } from '@excalidraw/excalidraw';
import { createWhiteboardSocketAdapter } from '../adapters/whiteboardSocketAdapter';
import {
  chunkElements,
  diffElements,
  elementsOutsideViewport,
  mergeElements,
  mergeFiles,
  throttle,
} from '../utils/sceneMerge';
import type {
  WhiteboardCursorPayload,
  WhiteboardElement,
  WhiteboardFiles,
  WhiteboardSyncPayload,
} from '../types';
import type { ExcalidrawImperativeAPI } from '../types/excalidraw-shim';

function makeClientId(participantId: string): string {
  return `wb-${participantId}-${Math.random().toString(36).slice(2, 10)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type CollaboratorCursor = {
  clientId: string;
  participantId: string;
  userName: string;
  x: number;
  y: number;
};

type CollabHandlers = {
  onLocalChange: (
    elements: readonly WhiteboardElement[],
    files?: WhiteboardFiles,
  ) => void;
  sendCursor: (x: number, y: number, button?: 'up' | 'down') => void;
  fitContent: () => void;
};

/**
 * Collaboration layer: joins whiteboard room, applies remote sync, batches local diffs.
 * Uses CaptureUpdateAction.NEVER + server-authoritative acks so strokes/shapes/images sync fully.
 */
export function useWhiteboardCollaboration(opts: {
  socket: Socket;
  roomId: string;
  participantId: string;
  userName: string;
  addToast?: (message: string) => void;
}) {
  const { socket, roomId, participantId, addToast } = opts;
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const clientIdRef = useRef(makeClientId(participantId));
  const revisionRef = useRef(0);
  /** Last scene known to be on the server (join + sync + authoritative acks). */
  const serverSceneRef = useRef<WhiteboardElement[]>([]);
  const filesRef = useRef<WhiteboardFiles>({});
  const applyingRemoteRef = useRef(0);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingElementsRef = useRef<WhiteboardElement[] | null>(null);
  const pendingFilesRef = useRef<WhiteboardFiles | undefined>(undefined);
  const flushInFlightRef = useRef(false);
  const needsReflushRef = useRef(false);
  const pendingRemoteRef = useRef<WhiteboardSyncPayload[]>([]);
  const knownRemoteIdsRef = useRef<Set<string>>(new Set());
  const handlersRef = useRef<CollabHandlers | null>(null);
  const adapterRef = useRef<ReturnType<typeof createWhiteboardSocketAdapter> | null>(null);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<{
    elements: WhiteboardElement[];
    files: WhiteboardFiles;
  } | null>(null);
  const [collaborators, setCollaborators] = useState<Record<string, CollaboratorCursor>>({});

  const beginRemoteApply = useCallback(() => {
    applyingRemoteRef.current += 1;
  }, []);

  const endRemoteApply = useCallback(() => {
    // Hold the gate through React/Excalidraw's onChange echo (microtask + frame).
    queueMicrotask(() => {
      requestAnimationFrame(() => {
        applyingRemoteRef.current = Math.max(0, applyingRemoteRef.current - 1);
      });
    });
  }, []);

  const ensureVisible = useCallback((elements: readonly WhiteboardElement[], forceFit = false) => {
    const api = apiRef.current;
    if (!api?.scrollToContent) return;
    const live = elements.filter((el) => !el.isDeleted);
    if (!live.length) return;

    try {
      if (forceFit) {
        api.scrollToContent(live, {
          fitToContent: true,
          animate: true,
          maxZoom: 1,
        });
        return;
      }

      const appState = api.getAppState?.();
      if (!appState || elementsOutsideViewport(live, appState)) {
        api.scrollToContent(live, {
          fitToContent: false,
          animate: true,
          maxZoom: 1.25,
        });
      }
    } catch {
      /* ignore viewport helpers on older builds */
    }
  }, []);

  const applyRemotePayload = useCallback(
    (payload: WhiteboardSyncPayload) => {
      revisionRef.current = payload.revision;
      serverSceneRef.current = payload.cleared
        ? mergeElements([], payload.elements)
        : mergeElements(serverSceneRef.current, payload.elements);
      filesRef.current = mergeFiles(filesRef.current, payload.files);

      const api = apiRef.current;
      if (!api) {
        pendingRemoteRef.current.push(payload);
        return;
      }

      beginRemoteApply();
      try {
        const local = payload.cleared
          ? []
          : (api.getSceneElementsIncludingDeleted() as unknown as WhiteboardElement[]);
        const appState = (api.getAppState?.() ?? {}) as Record<string, unknown>;
        const reconciled = payload.cleared
          ? (payload.elements as never[])
          : (reconcileElements(
              local as never[],
              payload.elements as never[],
              appState as never,
            ) as unknown as WhiteboardElement[]);

        api.updateScene({
          elements: reconciled as never,
          captureUpdate: CaptureUpdateAction.NEVER,
        });
        if (payload.files) {
          api.addFiles(Object.values(payload.files) as never);
        }

        const touched: WhiteboardElement[] = [];
        for (const el of payload.elements) {
          if (el.isDeleted) continue;
          const isNew = !knownRemoteIdsRef.current.has(el.id);
          knownRemoteIdsRef.current.add(el.id);
          touched.push(el);
          if (isNew) {
            /* tracked via touched */
          }
        }
        if (payload.cleared) {
          knownRemoteIdsRef.current.clear();
        } else if (touched.length > 0) {
          // Keep strokes/shapes/images in view as they grow, not only on first id.
          queueMicrotask(() => ensureVisible(touched));
        }
      } finally {
        endRemoteApply();
      }
    },
    [beginRemoteApply, endRemoteApply, ensureVisible],
  );

  const setApi = useCallback(
    (api: ExcalidrawImperativeAPI | null) => {
      apiRef.current = api;
      if (!api) return;

      const queued = pendingRemoteRef.current.splice(0);
      if (queued.length > 0) {
        for (const payload of queued) {
          applyRemotePayload(payload);
        }
      } else if (serverSceneRef.current.length > 0) {
        beginRemoteApply();
        try {
          api.updateScene({
            elements: serverSceneRef.current as never,
            captureUpdate: CaptureUpdateAction.NEVER,
          });
          if (Object.keys(filesRef.current).length > 0) {
            api.addFiles(Object.values(filesRef.current) as never);
          }
        } finally {
          endRemoteApply();
        }
      }

      requestAnimationFrame(() => {
        ensureVisible(serverSceneRef.current, true);
        api.refresh?.();
      });
    },
    [applyRemotePayload, beginRemoteApply, endRemoteApply, ensureVisible],
  );

  useEffect(() => {
    const adapter = createWhiteboardSocketAdapter({
      socket,
      roomId,
      clientId: clientIdRef.current,
    });
    adapterRef.current = adapter;

    let cancelled = false;

    const offSync = adapter.onSync((payload) => {
      if (payload.clientId === clientIdRef.current) {
        revisionRef.current = payload.revision;
        // Still absorb authoritative file/element echoes for our own broadcasts.
        if (payload.files) {
          filesRef.current = mergeFiles(filesRef.current, payload.files);
        }
        if (payload.elements?.length) {
          serverSceneRef.current = mergeElements(serverSceneRef.current, payload.elements);
        }
        return;
      }
      applyRemotePayload(payload);
    });

    const offCursor = adapter.onCursor((payload: WhiteboardCursorPayload) => {
      setCollaborators((prev) => ({
        ...prev,
        [payload.clientId]: {
          clientId: payload.clientId,
          participantId: payload.participantId,
          userName: payload.userName,
          x: payload.x,
          y: payload.y,
        },
      }));
    });

    const offError = adapter.onError((payload) => {
      addToast?.(payload.message || 'Whiteboard error');
    });

    const scheduleFlush = (immediate = false) => {
      if (flushTimerRef.current) {
        if (!immediate) return;
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      flushTimerRef.current = setTimeout(() => {
        void flush();
      }, immediate ? 0 : 32);
    };

    const flush = async () => {
      flushTimerRef.current = null;
      if (flushInFlightRef.current) {
        needsReflushRef.current = true;
        return;
      }

      const elements = pendingElementsRef.current;
      const files = pendingFilesRef.current;
      pendingElementsRef.current = null;
      pendingFilesRef.current = undefined;
      if (!elements) return;

      const changed = diffElements(serverSceneRef.current, elements);
      if (changed.length === 0 && !files) return;

      flushInFlightRef.current = true;
      let failed = false;
      try {
        const batches = changed.length > 0 ? chunkElements(changed, 200) : [[] as WhiteboardElement[]];
        let filesToSend = files;

        for (let i = 0; i < batches.length; i += 1) {
          const batch = batches[i];
          if (batch.length === 0 && !filesToSend) continue;

          let attempts = 0;
          let sent = false;
          while (attempts < 8) {
            const ack = await adapter.sendUpdate({
              elements: batch,
              files: i === 0 ? filesToSend : undefined,
              baseRevision: revisionRef.current,
            });

            if (ack?.code === 'RATE_LIMITED' || ack?.error === 'Rate limited') {
              attempts += 1;
              await sleep(50 * attempts);
              continue;
            }

            if (ack?.error || ack?.code === 'PAYLOAD_TOO_LARGE' || ack?.code === 'VALIDATION_ERROR') {
              addToast?.(ack.error || 'Whiteboard update failed');
              failed = true;
              break;
            }

            if (ack?.revision != null) revisionRef.current = ack.revision;

            // Prefer server-authoritative element copies for touched ids.
            if (ack?.elements && ack.elements.length > 0) {
              serverSceneRef.current = mergeElements(serverSceneRef.current, ack.elements);
              for (const el of ack.elements) {
                if (!el.isDeleted) knownRemoteIdsRef.current.add(el.id);
              }
            } else if (batch.length > 0 && (ack?.applied == null || ack.applied > 0)) {
              serverSceneRef.current = mergeElements(serverSceneRef.current, batch);
              for (const el of batch) {
                if (!el.isDeleted) knownRemoteIdsRef.current.add(el.id);
              }
            }

            if (ack?.files) {
              filesRef.current = mergeFiles(filesRef.current, ack.files);
            }

            if (i === 0) filesToSend = undefined;
            sent = true;
            break;
          }

          if (!sent) {
            failed = true;
            break;
          }
        }
      } finally {
        flushInFlightRef.current = false;
        if (failed) {
          // Re-queue the latest local scene so strokes are not dropped.
          const api = apiRef.current;
          if (api) {
            pendingElementsRef.current =
              api.getSceneElementsIncludingDeleted() as unknown as WhiteboardElement[];
          } else if (elements) {
            pendingElementsRef.current = elements;
          }
          if (files) {
            pendingFilesRef.current = { ...(pendingFilesRef.current ?? {}), ...files };
          }
          needsReflushRef.current = true;
        }
        if (needsReflushRef.current || pendingElementsRef.current) {
          needsReflushRef.current = false;
          scheduleFlush();
        }
      }
    };

    handlersRef.current = {
      onLocalChange: (elements, files) => {
        if (applyingRemoteRef.current > 0) return;
        pendingElementsRef.current = elements as WhiteboardElement[];
        if (files && Object.keys(files).length > 0) {
          const newFiles: WhiteboardFiles = {};
          for (const [id, file] of Object.entries(files)) {
            if (!filesRef.current[id]) newFiles[id] = file;
          }
          if (Object.keys(newFiles).length > 0) {
            filesRef.current = { ...filesRef.current, ...newFiles };
            pendingFilesRef.current = {
              ...(pendingFilesRef.current ?? {}),
              ...newFiles,
            };
          }
        }
        scheduleFlush();
      },
      sendCursor: throttle((x: number, y: number, button?: 'up' | 'down') => {
        adapter.sendCursor({ x, y, pointer: 'mouse', button });
        // Commit the finished stroke/shape as soon as the pointer lifts.
        if (button === 'up') {
          const api = apiRef.current;
          if (api && applyingRemoteRef.current === 0) {
            pendingElementsRef.current =
              api.getSceneElementsIncludingDeleted() as unknown as WhiteboardElement[];
            scheduleFlush(true);
          }
        }
      }, 40),
      fitContent: () => {
        const api = apiRef.current;
        const els =
          (api?.getSceneElementsIncludingDeleted() as unknown as WhiteboardElement[] | undefined) ??
          serverSceneRef.current;
        ensureVisible(els, true);
      },
    };

    const bootstrap = async () => {
      const ack = await adapter.join();
      if (cancelled) return;
      revisionRef.current = ack.revision;
      serverSceneRef.current = ack.elements;
      filesRef.current = ack.files ?? {};
      knownRemoteIdsRef.current = new Set(
        ack.elements.filter((el) => !el.isDeleted).map((el) => el.id),
      );
      setInitialData({ elements: ack.elements, files: ack.files ?? {} });
      setReady(true);
      setError(null);
    };

    void bootstrap().catch((err) => {
      if (cancelled) return;
      const msg = err instanceof Error ? err.message : 'Failed to join whiteboard';
      setError(msg);
      addToast?.(msg);
    });

    const onReconnect = () => {
      void (async () => {
        try {
          const ack = await adapter.join();
          if (cancelled) return;
          revisionRef.current = ack.revision;
          serverSceneRef.current = ack.elements;
          filesRef.current = ack.files ?? {};
          knownRemoteIdsRef.current = new Set(
            ack.elements.filter((el) => !el.isDeleted).map((el) => el.id),
          );

          const api = apiRef.current;
          if (api) {
            beginRemoteApply();
            try {
              api.updateScene({
                elements: ack.elements as never,
                captureUpdate: CaptureUpdateAction.NEVER,
              });
              if (ack.files) api.addFiles(Object.values(ack.files) as never);
            } finally {
              endRemoteApply();
            }
            ensureVisible(ack.elements, true);
          } else {
            setInitialData({ elements: ack.elements, files: ack.files ?? {} });
          }
          setReady(true);
          setError(null);
          if (api) {
            pendingElementsRef.current =
              api.getSceneElementsIncludingDeleted() as unknown as WhiteboardElement[];
            scheduleFlush(true);
          }
        } catch {
          /* join retry on next connect */
        }
      })();
    };
    socket.on('connect', onReconnect);

    return () => {
      cancelled = true;
      socket.off('connect', onReconnect);
      offSync();
      offCursor();
      offError();
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      handlersRef.current = null;
      adapterRef.current = null;
      adapter.destroy();
    };
  }, [socket, roomId, participantId, addToast, applyRemotePayload, beginRemoteApply, endRemoteApply, ensureVisible]);

  const onChange = useCallback(
    (elements: readonly WhiteboardElement[], files?: WhiteboardFiles) => {
      handlersRef.current?.onLocalChange(elements, files);
    },
    [],
  );

  const onPointerUpdate = useCallback(
    (payload: { pointer: { x: number; y: number }; button: 'up' | 'down' }) => {
      handlersRef.current?.sendCursor(
        payload.pointer.x,
        payload.pointer.y,
        payload.button,
      );
    },
    [],
  );

  const fitContent = useCallback(() => {
    handlersRef.current?.fitContent();
  }, []);

  return {
    ready,
    error,
    initialData,
    collaborators,
    setApi,
    clientId: clientIdRef.current,
    onChange,
    onPointerUpdate,
    fitContent,
  };
}
