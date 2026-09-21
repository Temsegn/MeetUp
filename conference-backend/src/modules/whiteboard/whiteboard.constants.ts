export const WB_EVENTS = {
  JOIN: 'whiteboard:join',
  LEAVE: 'whiteboard:leave',
  /** Client → server: partial element/file update. */
  UPDATE: 'whiteboard:update',
  /** Server → clients: applied partial update with server revision. */
  SYNC: 'whiteboard:sync',
  /** Throttled pointer presence (not persisted). */
  CURSOR: 'whiteboard:cursor',
  CLEAR: 'whiteboard:clear',
  ERROR: 'whiteboard:error',
  /** Someone opened the shared board — others should open their panel. */
  VISIBILITY: 'whiteboard:visibility',
  /** Late joiner asks whether the board is currently active in the meeting. */
  GET_VISIBILITY: 'whiteboard:get-visibility',
} as const;

/** Max serialized update payload size (bytes). */
export const WB_MAX_UPDATE_BYTES = 512_000;

/** Soft rate limit for inbound updates per socket. */
export const WB_UPDATE_RATE_LIMIT = 40;
export const WB_UPDATE_RATE_WINDOW_MS = 1_000;

/** Soft rate limit for cursor events per socket. */
export const WB_CURSOR_RATE_LIMIT = 20;
export const WB_CURSOR_RATE_WINDOW_MS = 1_000;

/** Max elements accepted in a single update batch. */
export const WB_MAX_ELEMENTS_PER_UPDATE = 500;

/** Soft cap on total scene size (including soft-deleted). */
export const WB_MAX_SCENE_ELEMENTS = 12_000;

/** Debounce persistence after scene changes. */
export const WB_PERSIST_DEBOUNCE_MS = 2_000;

/**
 * Future host controls (not all enforced yet).
 * Meeting participants in-room may edit; clear requires in-room membership.
 */
export const WB_FUTURE_HOST_CONTROLS = [
  'LOCK_EDITING',
  'VIEW_ONLY',
  'REVOKE_EDIT',
] as const;
