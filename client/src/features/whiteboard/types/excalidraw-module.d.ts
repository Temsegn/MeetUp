declare module '@excalidraw/excalidraw' {
  import type { ComponentType } from 'react';

  export const Excalidraw: ComponentType<Record<string, unknown>>;

  export const CaptureUpdateAction: {
    readonly IMMEDIATELY: 'IMMEDIATELY';
    readonly NEVER: 'NEVER';
    readonly EVENTUALLY: 'EVENTUALLY';
  };

  export function reconcileElements(
    localElements: readonly unknown[],
    remoteElements: readonly unknown[],
    appState: Record<string, unknown>,
  ): unknown[];
}

declare module '@excalidraw/excalidraw/index.css';
