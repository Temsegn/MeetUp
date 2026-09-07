/** Workspace DM Socket.IO events — shares the authenticated Socket.IO server (not meeting-room chat). */
export const DM_EVENTS = {
  JOIN: 'dm:join',
  LEAVE: 'dm:leave',
  SYNC: 'dm:sync',
  SEND: 'dm:send',
  MESSAGE: 'dm:message',
  MESSAGE_UPDATE: 'dm:message-update',
  MESSAGE_DELETE: 'dm:message-delete',
  EDIT: 'dm:edit',
  DELETE: 'dm:delete',
  REACT: 'dm:react',
  PIN: 'dm:pin',
  FORWARD: 'dm:forward',
  READ: 'dm:read',
  DELIVERED: 'dm:delivered',
  TYPING: 'dm:typing',
  PRESENCE: 'dm:presence',
  CALL_INVITE: 'dm:call-invite',
  CALL_ACCEPT: 'dm:call-accept',
  CALL_REJECT: 'dm:call-reject',
  CALL_SIGNAL: 'dm:call-signal',
  CALL_HANGUP: 'dm:call-hangup',
  CALL_RINGING: 'dm:call-ringing',
} as const;

export function dmRoom(conversationId: string): string {
  return `dm:${conversationId}`;
}

export function userRoom(userId: string): string {
  return `user:${userId}`;
}
