export const REMOTE_UI_COMMANDS = [
  'OPEN_CHAT',
  'CLOSE_CHAT',
  'OPEN_PARTICIPANTS',
  'CLOSE_PARTICIPANTS',
  'TOGGLE_CHAT_PANEL',
  'TOGGLE_PARTICIPANTS_PANEL',
  'SELECT_PARTICIPANT',
  'CHANGE_LAYOUT',
  'SCROLL_PANEL',
  'TOGGLE_MUTE',
  'TOGGLE_CAMERA',
  'START_SCREEN_SHARE',
  'STOP_SCREEN_SHARE',
  'RAISE_HAND',
  'LOWER_HAND',
  'SEND_CHAT',
  'SEND_REACTION',
] as const;

export type RemoteUiCommand = (typeof REMOTE_UI_COMMANDS)[number];

export const RC_EVENTS = {
  REQUEST: 'remote-control:request',
  RESPOND: 'remote-control:respond',
  ACTION: 'remote-control:action',
  STOP: 'remote-control:stop',
  STARTED: 'remote-control:started',
  REJECTED: 'remote-control:rejected',
  STOPPED: 'remote-control:stopped',
  REVOKED: 'remote-control:revoked',
  ENDED: 'remote-control:ended',
  CURSOR: 'remote-control:cursor',
  UI_STATE: 'remote-control:ui-state',
  DRAFT: 'remote-control:draft',
  VIEW: 'remote-control:view',
  HISTORY: 'remote-control:history',
  SYNC: 'remote-control:sync',
} as const;

export type RemoteControlRole = 'idle' | 'outgoing-pending' | 'incoming-pending' | 'controlling' | 'controlled';
export type RemoteViewMode = 'self' | 'remote';

export interface IncomingControlRequest {
  sessionId: string;
  roomId: string;
  requesterId: string;
  requesterName: string;
  permissions: RemoteUiCommand[];
}

export interface ActiveControlSession {
  sessionId: string;
  roomId: string;
  requesterId: string;
  requesterName: string;
  controlledUserId: string;
  controlledName: string;
  role: 'controlling' | 'controlled';
  permissions: RemoteUiCommand[];
}

export interface ActionAttribution {
  initiatorId: string;
  initiatorName: string;
  executorId: string;
  executorName: string;
}

export interface RemoteControlActionEnvelope {
  sessionId: string;
  requesterId: string;
  controlledUserId: string;
  actionType: RemoteUiCommand;
  payload: Record<string, unknown>;
  timestamp: number;
  seq: number;
  attribution?: ActionAttribution;
}

export interface ControlledUiState {
  version: number;
  sidebar: 'chat' | 'participants' | null;
  layout: 'gallery' | 'presentation';
  selectedParticipantId: string | null;
  isMuted: boolean;
  isCameraOff: boolean;
  isSharingScreen: boolean;
  isHandRaised: boolean;
  chatDraft: string;
  showAllParticipants: boolean;
  scrollTop: number;
  whiteboardOpen: boolean;
}

export interface RemoteCursorState {
  x: number;
  y: number;
  visible: boolean;
  source: 'controller' | 'controlled';
  label: string;
}

export interface RemoteControlHistoryEvent {
  id: string;
  sessionId: string;
  roomId: string;
  at: number;
  seq?: number;
  action: string;
  controllerId: string;
  controllerName: string;
  controlledUserId: string;
  controlledName: string;
  result: 'ok' | 'rejected';
  metadata?: Record<string, unknown>;
}

export type CommandHandlerMap = Partial<Record<RemoteUiCommand, (payload: Record<string, unknown>) => void | Promise<void>>>;
