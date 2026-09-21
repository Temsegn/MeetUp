import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001';

let currentSocket: Socket | null = null;

/**
 * Create a fresh, authenticated Socket.IO client for a meeting session.
 *
 * The socket is NOT a singleton — each meeting session creates one and
 * destroys it on leave. This prevents stale state from leaking between sessions.
 *
 * @param token - JWT token from auth (sent in handshake for server auth middleware)
 */
export function createSocketClient(token: string): Socket {
  if (currentSocket) {
    currentSocket.disconnect();
  }

  const socket = io(API_URL, {
    transports: ['websocket'],
    auth: { token: `Bearer ${token}` },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  currentSocket = socket;

  socket.on('connect', () => {
    console.info('[Socket] Connected', socket.id);
  });

  socket.on('connect_error', (err) => {
    console.error('[Socket] Connection error', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.warn('[Socket] Disconnected', reason);
    if (currentSocket === socket) {
      currentSocket = null;
    }
  });

  return socket;
}

export const socketClient = {
  getSocket: () => currentSocket,
  createSocketClient,
};

