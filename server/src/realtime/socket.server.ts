import { Server as SocketIOServer, Socket } from 'socket.io';
import { socketAuthMiddleware } from './middleware/socket.auth';
import { registerMediaHandlers, _cleanupPeer } from './handlers/media.handler';
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
import { buildAdmissionIdentityKey } from '../database/models/MeetingAdmission.model';
import { scheduleSoftDisconnect } from './soft-disconnect';
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

      const identityKey =
        current.identityKey ||
        buildAdmissionIdentityKey({
          userId: user.userId,
          isGuest: Boolean(user.isGuest) || user.userId.startsWith('guest_'),
          email: user.guestEmail || user.email || null,
        });

      // Soft disconnect: keep admission; delay hard media cleanup so brief
      // Wi-Fi↔mobile / sleep blips can resume without "left" for everyone.
      socket.data.softDisconnect = true;
      scheduleSoftDisconnect({
        io,
        roomId: current.roomId,
        participantId: current.participantId,
        userId: user.userId,
        identityKey,
        name: user.name,
        socketId: socket.id,
        joinedAt: current.joinedAt,
        workspaceId: current.workspaceId,
        sessionId: current.sessionId,
        onExpire: () => {
          try {
            // Restore room meta so metering / cleanup can finish correctly.
            socket.data.currentRoom = {
              roomId: current.roomId,
              participantId: current.participantId,
              joinedAt: current.joinedAt,
              workspaceId: current.workspaceId,
              sessionId: current.sessionId,
              identityKey,
            };
            _cleanupPeer(io, socket, current.roomId, current.participantId);
          } catch (err) {
            logger.warn('Hard cleanup after soft-disconnect grace failed', {
              roomId: current.roomId,
              participantId: current.participantId,
              err: err instanceof Error ? err.message : String(err),
            });
          }
        },
      });

      // Keep currentRoom on the dead socket for grace-expire metering, but mark soft.
      // A new socket will take over via join-room + takeSoftDisconnect.
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
