import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '../auth/auth.service';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001';

/**
 * Persistent app-level Socket.IO client for workspace DMs / chat calls.
 * Uses the same authenticated Socket.IO server as meetings, but a separate
 * connection so leaving a meeting does not drop chat presence.
 */
let dmSocket: Socket | null = null;

export const DM_EVENTS = {
  JOIN: 'dm:join',
  LEAVE: 'dm:leave',
  SEND: 'dm:send',
  MESSAGE: 'dm:message',
  MESSAGE_UPDATE: 'dm:message-update',
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

export function getDmSocket(): Socket | null {
  return dmSocket;
}

export function connectDmSocket(): Socket | null {
  const token = getAccessToken();
  if (!token) return null;

  if (dmSocket?.connected) return dmSocket;
  if (dmSocket) {
    dmSocket.auth = { token: `Bearer ${token}` };
    dmSocket.connect();
    return dmSocket;
  }

  dmSocket = io(API_URL, {
    transports: ['websocket'],
    auth: { token: `Bearer ${token}` },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 800,
    reconnectionDelayMax: 8000,
  });

  return dmSocket;
}

export function disconnectDmSocket(): void {
  if (!dmSocket) return;
  dmSocket.removeAllListeners();
  dmSocket.disconnect();
  dmSocket = null;
}

export function emitAck<T = unknown>(
  event: string,
  payload: unknown,
  timeoutMs = 12_000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const socket = connectDmSocket();
    if (!socket) {
      reject(new Error('Not connected'));
      return;
    }
    const timer = window.setTimeout(() => reject(new Error('Socket timeout')), timeoutMs);
    socket.emit(event, payload, (res: T & { error?: string }) => {
      window.clearTimeout(timer);
      if (res && typeof res === 'object' && 'error' in res && res.error) {
        reject(new Error(String(res.error)));
        return;
      }
      resolve(res);
    });
  });
}
