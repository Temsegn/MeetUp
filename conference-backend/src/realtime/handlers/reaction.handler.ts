import { Server, Socket } from 'socket.io';
import { logger } from '../../infrastructure/logging/logger';
import { metrics } from '../../infrastructure/metrics/metrics.service';
import {
  validatePayload,
  SendReactionSchema,
  RaiseHandSchema,
} from '../../shared/validation/socket.schemas';

type Callback = (res: unknown) => void;

export const registerReactionHandlers = (io: Server, socket: Socket) => {
  const user = socket.data.user as { userId: string; name: string };

  socket.on('send-reaction', (payload: unknown, callback?: Callback) => {
    const v = validatePayload(SendReactionSchema, payload);
    if (!v.success) {
      metrics.validationFailures.inc();
      return callback?.({ error: v.error, code: 'VALIDATION_ERROR' });
    }
    const { roomId, reaction } = v.data;

    const currentRoom = socket.data.currentRoom as { roomId: string; participantId: string } | undefined;
    if (!currentRoom || currentRoom.roomId !== roomId) {
      return callback?.({ error: 'Not in room', code: 'NOT_IN_ROOM' });
    }

    // participantId comes from server — not from client payload
    socket.to(roomId).emit('peer-reaction', {
      participantId: currentRoom.participantId,
      reaction,
    });

    callback?.({ success: true });
    logger.debug('Reaction sent', { roomId, participantId: currentRoom.participantId, reaction });
  });

  socket.on('raise-hand', (payload: unknown, callback?: Callback) => {
    const v = validatePayload(RaiseHandSchema, payload);
    if (!v.success) {
      metrics.validationFailures.inc();
      return callback?.({ error: v.error, code: 'VALIDATION_ERROR' });
    }
    const { roomId, isRaised } = v.data;

    const currentRoom = socket.data.currentRoom as { roomId: string; participantId: string } | undefined;
    if (!currentRoom || currentRoom.roomId !== roomId) {
      return callback?.({ error: 'Not in room', code: 'NOT_IN_ROOM' });
    }

    // Server derives participantId — not trusted from client
    io.to(roomId).emit('peer-raise-hand', {
      participantId: currentRoom.participantId,
      isRaised,
    });

    callback?.({ success: true });
  });
};
