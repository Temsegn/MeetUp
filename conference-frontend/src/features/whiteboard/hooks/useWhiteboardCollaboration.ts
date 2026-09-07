import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { createWhiteboardSocketAdapter } from '../adapters/whiteboardSocketAdapter';
import {
  diffElements,
  mergeElements,
  mergeFiles,
  throttle,
} from '../utils/sceneMerge';
import type {
  WhiteboardCursorPayload,
  WhiteboardElement,
  WhiteboardFiles,
} from '../types';
import type { ExcalidrawImperativeAPI } from '../types/excalidraw-shim';

function makeClientId(participantId: string): string {
  return `wb-${participantId}-${Math.random().toString(36).slice(2, 10)}`;
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
};

/**
 * Collaboration layer: joins whiteboard room, applies remote sync, batches local diffs.
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
  const lastSentRef = useRef<WhiteboardElement[]>([]);
  const filesRef = useRef<WhiteboardFiles>({});
  const applyingRemoteRef = useRef(false);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingElementsRef = useRef<WhiteboardElement[] | null>(null);
  const pendingFilesRef = useRef<WhiteboardFiles | undefined>(undefined);
  const handlersRef = useRef<CollabHandlers | null>(null);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<{
    elements: WhiteboardElement[];
    files: WhiteboardFiles;
  } | null>(null);
  const [collaborators, setCollaborators] = useState<Record<string, CollaboratorCursor>>({});

  const setApi = useCallback((api: ExcalidrawImperativeAPI | null) => {
    apiRef.current = api;
  }, []);

  useEffect(() => {
    const adapter = createWhiteboardSocketAdapter({
      socket,
      roomId,
      clientId: clientIdRef.current,
    });

    let cancelled = false;

    const offSync = adapter.onSync((payload) => {
      if (payload.clientId === clientIdRef.current) {
        revisionRef.current = payload.revision;
        return;
      }

      revisionRef.current = payload.revision;
      const api = apiRef.current;
      if (!api) {
        // Buffer into initial-like state before mount
        lastSentRef.current = mergeElements(lastSentRef.current, payload.elements);
        filesRef.current = mergeFiles(filesRef.current, payload.files);
        return;
      }

      applyingRemoteRef.current = true;
      try {
        const current = (
          payload.cleared
            ? []
            : (api.getSceneElementsIncludingDeleted() as unknown as WhiteboardElement[])
        );
        const merged = mergeElements(current, payload.elements);
        filesRef.current = mergeFiles(filesRef.current, payload.files);
        lastSentRef.current = merged;
        api.updateScene({ elements: merged as never });
        if (payload.files) {
          api.addFiles(Object.values(payload.files) as never);
        }
      } finally {
        queueMicrotask(() => {
          applyingRemoteRef.current = false;
        });
      }
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

    const flush = () => {
      flushTimerRef.current = null;
      const elements = pendingElementsRef.current;
      pendingElementsRef.current = null;
      const files = pendingFilesRef.current;
      pendingFilesRef.current = undefined;
      if (!elements || elements.length === 0) return;

      const changed = diffElements(lastSentRef.current, elements);
      if (changed.length === 0 && !files) return;

      lastSentRef.current = elements;
      void adapter
        .sendUpdate({
          elements: changed,
          files,
          baseRevision: revisionRef.current,
        })
        .then((ack) => {
          if (ack?.revision != null) revisionRef.current = ack.revision;
          if (ack?.error) addToast?.(ack.error);
        });
    };

    const scheduleFlush = () => {
      if (flushTimerRef.current) return;
      flushTimerRef.current = setTimeout(flush, 80);
    };

    handlersRef.current = {
      onLocalChange: (elements, files) => {
        if (applyingRemoteRef.current) return;
        pendingElementsRef.current = elements as WhiteboardElement[];
        if (files && Object.keys(files).length > 0) {
          const newFiles: WhiteboardFiles = {};
          for (const [id, file] of Object.entries(files)) {
            if (!filesRef.current[id]) newFiles[id] = file;
          }
          if (Object.keys(newFiles).length > 0) {
            filesRef.current = { ...filesRef.current, ...newFiles };
            pendingFilesRef.current = newFiles;
          }
        }
        scheduleFlush();
      },
      sendCursor: throttle((x: number, y: number, button?: 'up' | 'down') => {
        adapter.sendCursor({ x, y, pointer: 'mouse', button });
      }, 50),
    };

    void (async () => {
      try {
        const ack = await adapter.join();
        if (cancelled) return;
        revisionRef.current = ack.revision;
        lastSentRef.current = ack.elements;
        filesRef.current = ack.files ?? {};
        setInitialData({ elements: ack.elements, files: ack.files ?? {} });
        setReady(true);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Failed to join whiteboard';
        setError(msg);
        addToast?.(msg);
      }
    })();

    return () => {
      cancelled = true;
      offSync();
      offCursor();
      offError();
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      handlersRef.current = null;
      adapter.destroy();
    };
  }, [socket, roomId, participantId, addToast]);

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

  return {
    ready,
    error,
    initialData,
    collaborators,
    setApi,
    clientId: clientIdRef.current,
    onChange,
    onPointerUpdate,
  };
}
