/** Wire / domain types for Excalidraw collaborative whiteboard. */

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

export type WhiteboardSnapshot = {
  whiteboardId: string;
  revision: number;
  elements: WhiteboardElement[];
  files: WhiteboardFiles;
};

export type WhiteboardUpdatePayload = {
  roomId: string;
  clientId: string;
  /** Client's last known server revision (informational; server is authoritative). */
  baseRevision?: number;
  /** Changed / new / soft-deleted elements only. */
  elements: WhiteboardElement[];
  /** Optional new/updated binary files referenced by elements. */
  files?: WhiteboardFiles;
};

export type WhiteboardSyncPayload = {
  roomId: string;
  revision: number;
  clientId: string;
  elements: WhiteboardElement[];
  files?: WhiteboardFiles;
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

export type WhiteboardErrorPayload = {
  code: string;
  message: string;
  roomId?: string;
};

export type WhiteboardRoomRef = {
  roomId: string;
  revision: number;
  elementCount: number;
  sessionCount: number;
};

export type WhiteboardJoinResult = {
  success: true;
  whiteboardId: string;
  revision: number;
  elements: WhiteboardElement[];
  files: WhiteboardFiles;
  participantId: string;
  clientId: string;
};
