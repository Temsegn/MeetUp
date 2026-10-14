import { Server as SocketIOServer, Socket } from 'socket.io';
import { socketAuthMiddleware } from './middleware/socket.auth';
import { registerMediaHandlers } from './handlers/media.handler';
import { registerChatHandlers, clearSocketRateLimit } from './handlers/chat.handler';
import { registerReactionHandlers } from './handlers/reaction.handler';
import { registerModerationHandlers } from './handlers/moderation.handler';
import { bindRemoteControlIo, registerRemoteControlHandlers } from '../modules/remote-control';
import { registerWhiteboardHandlers, clearWhiteboardRateLimit } from '../modules/whiteboard';
import { bindMessagesIo, registerMessagesHandlers } from '../modules/messages/messages.gateway';
import { logger } from '../infrastructure/logging/logger';
import { metrics } from '../infrastructure/metrics/metrics.service';
import { startMeetingDurationJob } from '../modules/meetings/meeting-duration.job';
import { startMeetingReminderJob } from '../modules/meetings/meeting-reminder.job';
import { startMeetingInviteDeliveryJob } from '../modules/meetings/meeting-invite-delivery.job';
import { beginSoftDisconnect } from './begin-soft-disconnect';
import { removeWaitingBySocket } from './waiting-room';

export const setupSocketServer = (io: SocketIOServer): void => {
  bindRemoteControlIo(io);
  bindMessagesIo(io);
  startMeetingDurationJob(io);
  startMeetingReminderJob();
  startMeetingInviteDeliveryJob();

  // ── Authentication middleware ──────────────────────────────────────────────
  io.use(socketAuthMiddleware);

  // ── Connection handler ─────────────────────────────────────────────────────
  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as {
      userId: string;
      name: string;
      email?: string;
      isGuest?: boolean;
      guestEmail?: string;
    };
    metrics.socketConnections.inc();

    logger.info('Socket connected', {
      socketId: socket.id,
      userId: user.userId,
      name: user.name,
    });

    // Register all domain handlers
    registerMediaHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerReactionHandlers(io, socket);
    registerModerationHandlers(io, socket);
    registerRemoteControlHandlers(io, socket);
    registerWhiteboardHandlers(io, socket);
    registerMessagesHandlers(io, socket);

    // ── Disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      metrics.socketConnections.dec();
      clearSocketRateLimit(socket.id);
      clearWhiteboardRateLimit(socket.id);

      logger.info('Socket disconnected', {
        socketId: socket.id,
        userId: user.userId,
        reason,
      });

      // Waiting lobby: drop request immediately (they can re-queue on reconnect).
      const waiting = removeWaitingBySocket(socket.id);
      if (waiting) {
        delete socket.data.waitingRequest;
        io.to(waiting.roomId).emit('waiting-request-resolved', {
          requestId: waiting.requestId,
          admitted: false,
        });
      }

      const current = socket.data.currentRoom as
        | {
            roomId: string;
            participantId: string;
            joinedAt?: Date;
            workspaceId?: string | null;
            sessionId?: string | null;
            identityKey?: string;
          }
        | undefined;

      if (!current) return;

      // Explicit leave already cleaned up and cleared currentRoom.
      if (socket.data.softDisconnect === false && !socket.data.currentRoom) return;

      // Soft disconnect: remotes see "Paused — connection lost" immediately;
      // hard leave after grace. Keep currentRoom for expire metering.
      beginSoftDisconnect(io, socket);
    });

    // Client still has a socket briefly (e.g. browser offline) — announce early
    // so remotes show paused without waiting for ping timeout.
    socket.on('announce-connection-lost', () => {
      beginSoftDisconnect(io, socket);
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
