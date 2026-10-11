import React, { useCallback, useMemo, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import { Excalidraw } from '@excalidraw/excalidraw';
import { Maximize2, X } from 'lucide-react';
import '@excalidraw/excalidraw/index.css';
import './whiteboard.css';
import { useWhiteboardCollaboration } from '../hooks/useWhiteboardCollaboration';
import type { WhiteboardElement, WhiteboardFiles } from '../types';
import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
} from '../types/excalidraw-shim';

interface WhiteboardStageProps {
  socket: Socket;
  roomId: string;
  participantId: string;
  userName: string;
  onClose: () => void;
  addToast?: (message: string) => void;
}

/**
 * In-stage Excalidraw whiteboard — Socket.IO collab with shared scene coords.
 * Keeps `data-meeting-whiteboard` for meeting recording capture.
 */
export const WhiteboardStage: React.FC<WhiteboardStageProps> = ({
  socket,
  roomId,
  participantId,
  userName,
  onClose,
  addToast,
}) => {
  const {
    ready,
    error,
    initialData,
    collaborators,
    setApi,
    onChange,
    onPointerUpdate,
    fitContent,
  } = useWhiteboardCollaboration({
    socket,
    roomId,
    participantId,
    userName,
    addToast,
  });

  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);

  const handleApi = useCallback(
    (api: ExcalidrawImperativeAPI) => {
      apiRef.current = api;
      setApi(api);
      try {
        api.updateScene({
          appState: {
            viewBackgroundColor: '#ffffff',
            theme: 'light',
            // Keep zen-mode off so tools stay available on mobile.
            zenModeEnabled: false,
            gridSize: null,
          } as never,
        } as never);
      } catch {
        /* ignore */
      }
    },
    [setApi],
  );

  const excalidrawCollaborators = useMemo(() => {
    const map = new Map<
      string,
      {
        username?: string;
        pointer?: { x: number; y: number; tool: 'pointer' | 'laser' };
      }
    >();
    for (const c of Object.values(collaborators)) {
      map.set(c.clientId, {
        username: c.userName,
        pointer: { x: c.x, y: c.y, tool: 'pointer' },
      });
    }
    return map;
  }, [collaborators]);

  React.useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    api.updateScene({
      collaborators: excalidrawCollaborators as never,
    });
  }, [excalidrawCollaborators]);

  const handleChange = useCallback(
    (
      elements: readonly unknown[],
      _appState: AppState,
      files: BinaryFiles,
    ) => {
      onChange(
        elements as WhiteboardElement[],
        files as unknown as WhiteboardFiles,
      );
    },
    [onChange],
  );

  const uiOptions = useMemo(
    () => ({
      canvasActions: {
        changeViewBackgroundColor: true,
        clearCanvas: true,
        export: false as const,
        loadScene: false,
        saveToActiveFile: false,
        toggleTheme: false,
        saveAsImage: true,
      },
      tools: {
        image: true,
      },
      dockedSidebarBreakpoint: 768,
    }),
    [],
  );

  const initialExcalidrawData = useMemo(() => {
    if (!initialData) return null;
    return {
      elements: initialData.elements as never[],
      files: initialData.files as never,
      appState: {
        viewBackgroundColor: '#ffffff',
        currentItemFontFamily: 1,
        theme: 'light' as const,
        openSidebar: null,
        openDialog: null,
        // Scene uses shared world coordinates; camera fits content on each device.
        scrollX: 0,
        scrollY: 0,
        zoom: { value: 1 },
      },
      scrollToContent: Boolean(initialData.elements?.some((el) => !el.isDeleted)),
    };
  }, [initialData]);

  return (
    <div
      className="meeting-whiteboard-stage"
      data-meeting-whiteboard="1"
      data-theme="light"
    >
      <div className="meeting-whiteboard-chrome">
        <button
          type="button"
          onClick={fitContent}
          className="meeting-whiteboard-fit"
          aria-label="Fit whiteboard content"
          title="Fit content"
        >
          <Maximize2 size={16} />
          <span>Fit</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="meeting-whiteboard-close"
          aria-label="Close whiteboard"
        >
          <X size={20} />
        </button>
      </div>

      {!ready && !error ? (
        <div className="meeting-whiteboard-status">Connecting whiteboard…</div>
      ) : null}

      {error ? (
        <div className="meeting-whiteboard-status meeting-whiteboard-status--error">
          {error}
        </div>
      ) : null}

      {ready && initialExcalidrawData ? (
        <div className="meeting-whiteboard-canvas">
          <Excalidraw
            excalidrawAPI={handleApi}
            initialData={initialExcalidrawData}
            onChange={handleChange}
            onPointerUpdate={onPointerUpdate}
            isCollaborating
            UIOptions={uiOptions}
            name={userName}
            theme="light"
            detectScroll
            handleKeyboardGlobally={false}
          />
        </div>
      ) : null}
    </div>
  );
};
