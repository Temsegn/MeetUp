export const WB_EVENTS = {
  JOIN: 'whiteboard:join',
  LEAVE: 'whiteboard:leave',
  UPDATE: 'whiteboard:update',
  SYNC: 'whiteboard:sync',
  CURSOR: 'whiteboard:cursor',
  CLEAR: 'whiteboard:clear',
  ERROR: 'whiteboard:error',
  VISIBILITY: 'whiteboard:visibility',
  GET_VISIBILITY: 'whiteboard:get-visibility',
} as const;

/** Minimal Excalidraw element shape used for collaboration. */
export type WhiteboardElement = {
  id: string;
  version: number;
  versionNonce: number;
  isDeleted?: boolean;
  [key: string]: unknown;
};

export type WhiteboardBinaryFile = {
  mimeType: string;
  id: string;
  dataURL: string;
  created: number;
  lastRetrieved?: number;
};

export type WhiteboardFiles = Record<string, WhiteboardBinaryFile>;

export type WhiteboardJoinAck =
  | {
      success: true;
      whiteboardId: string;
      revision: number;
      elements: WhiteboardElement[];
      files: WhiteboardFiles;
      participantId: string;
      clientId: string;
    }
  | { error: string; code?: string };

export type WhiteboardSyncPayload = {
  roomId: string;
  revision: number;
  clientId: string;
  elements: WhiteboardElement[];
  files?: WhiteboardFiles;
  cleared?: boolean;
};

export type WhiteboardCursorPayload = {
  roomId: string;
  clientId: string;
  participantId: string;
  userName: string;
  x: number;
  y: number;
  pointer?: 'mouse' | 'touch' | 'pen';
  button?: 'up' | 'down';
};

export type WhiteboardVisibilityEvent = {
  roomId: string;
  open: boolean;
  openedBy?: { participantId: string; name: string };
  closedBy?: { participantId: string; name: string };
};

export type WhiteboardVisibilityAck = {
  success?: boolean;
  active?: boolean;
  openedByParticipantId?: string | null;
  openedByName?: string | null;
  error?: string;
  code?: string;
};

export type WhiteboardUpdateAck = {
  success?: boolean;
  revision?: number;
  applied?: number;
  error?: string;
  code?: string;
};
