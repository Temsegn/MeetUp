/**
 * Thin typing surface for Excalidraw so collaboration code does not depend on
 * unstable deep import paths. Runtime still loads `@excalidraw/excalidraw`.
 */
export type ExcalidrawImperativeAPI = {
  updateScene: (scene: {
    elements?: unknown[];
    collaborators?: Map<string, unknown>;
    appState?: Record<string, unknown>;
    /** Use CaptureUpdateAction.NEVER for remote / init updates. */
    captureUpdate?: 'IMMEDIATELY' | 'NEVER' | 'EVENTUALLY' | string;
  }) => void;
  getSceneElementsIncludingDeleted: () => readonly unknown[];
  getAppState?: () => {
    scrollX: number;
    scrollY: number;
    width: number;
    height: number;
    zoom: { value: number };
  };
  scrollToContent?: (
    target?: unknown,
    opts?: {
      fitToContent?: boolean;
      fitToViewport?: boolean;
      animate?: boolean;
      duration?: number;
      minZoom?: number;
      maxZoom?: number;
      viewportZoomFactor?: number;
    },
  ) => void;
  addFiles: (files: unknown[]) => void;
  refresh?: () => void;
};

export type AppState = Record<string, unknown>;
export type BinaryFiles = Record<string, unknown>;
