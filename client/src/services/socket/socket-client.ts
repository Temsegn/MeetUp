import { io, Socket } from 'socket.io-client';
import { API_URL } from '../../lib/apiUrl';

let currentSocket: Socket | null = null;

/**
 * Create a fresh, authenticated Socket.IO client for a meeting session.
 *
 * Reconnection is aggressive (bounded) so Wi-Fi↔mobile handovers recover
 * without abandoning the meeting UI. Media is rebuilt via join-room after
 * signaling recovers; admission is persisted server-side.
 */
export function createSocketClient(token: string): Socket {
  if (currentSocket) {
    currentSocket.removeAllListeners();
    currentSocket.disconnect();
  }

  const socket = io(API_URL, {
    transports: ['websocket'],
    auth: { token: `Bearer ${token}` },
    reconnection: true,
    reconnectionAttempts: 40,
    reconnectionDelay: 800,
    reconnectionDelayMax: 12_000,
    randomizationFactor: 0.4,
    timeout: 20_000,
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
    // Keep currentSocket reference while Manager may still reconnect.
    // Only clear when the client intentionally disconnects.
    if (reason === 'io client disconnect' && currentSocket === socket) {
      currentSocket = null;
    }
  });

  return socket;
}

export const socketClient = {
  getSocket: () => currentSocket,
  createSocketClient,
};
