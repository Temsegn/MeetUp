import { Server as SocketIOServer, Socket } from 'socket.io';
import { socketAuthMiddleware } from './middleware/socket.auth';
import { registerMediaHandlers, _cleanupPeer } from './handlers/media.handler';
import { registerChatHandlers, clearSocketRateLimit } from './handlers/chat.handler';
import { registerReactionHandlers } from './handlers/reaction.handler';
import { logger } from '../infrastructure/logging/logger';
import { metrics } from '../infrastructure/metrics/metrics.service';

export const setupSocketServer = (io: SocketIOServer): void => {
  // ── Authentication middleware ──────────────────────────────────────────────
  io.use(socketAuthMiddleware);

  // ── Connection handler ─────────────────────────────────────────────────────
  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as { userId: string; name: string };
    metrics.socketConnections.inc();

    logger.info('Socket connected', {
      socketId: socket.id,
      userId:   user.userId,
      name:     user.name,
    });

    // Register all domain handlers
    registerMediaHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerReactionHandlers(io, socket);

    // ── Disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      metrics.socketConnections.dec();
      clearSocketRateLimit(socket.id);

      logger.info('Socket disconnected', {
        socketId: socket.id,
        userId:   user.userId,
        reason,
      });

      // Clean up media state if the peer was in a room
      const current = socket.data.currentRoom as
        | { roomId: string; participantId: string }
        | undefined;

      if (current) {
        _cleanupPeer(io, socket, current.roomId, current.participantId);
      }
    });

    // ── Error handler ─────────────────────────────────────────────────────────
    socket.on('error', (err) => {
      metrics.socketErrors.inc();
      logger.error('Socket error', { socketId: socket.id, err: err.message });
    });
  });

  // ── Engine-level connection errors ────────────────────────────────────────
  io.engine.on('connection_error', (err: Error) => {
    metrics.socketErrors.inc();
    logger.warn('Socket connection error', { message: err.message });
  });
};
