/**
 * Thin typing surface for Excalidraw so collaboration code does not depend on
 * unstable deep import paths. Runtime still loads `@excalidraw/excalidraw`.
 */
export type ExcalidrawImperativeAPI = {
  updateScene: (scene: {
    elements?: unknown[];
    collaborators?: Map<string, unknown>;
    appState?: Record<string, unknown>;
  }) => void;
  getSceneElementsIncludingDeleted: () => readonly unknown[];
  addFiles: (files: unknown[]) => void;
};

export type AppState = Record<string, unknown>;
export type BinaryFiles = Record<string, unknown>;
