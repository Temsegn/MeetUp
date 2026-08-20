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

export const DEFAULT_CONTROL_PERMISSIONS: readonly RemoteUiCommand[] = REMOTE_UI_COMMANDS;

export const PENDING_REQUEST_TTL_MS = 45_000;
export const MAX_SESSION_MS = 2 * 60 * 60 * 1000;
export const ACTION_RATE_LIMIT = 20;
export const ACTION_RATE_WINDOW_MS = 1_000;
export const CURSOR_RATE_LIMIT = 30;
export const UI_STATE_RATE_LIMIT = 12;
export const DRAFT_RATE_LIMIT = 20;
export const HISTORY_LIMIT = 250;

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
