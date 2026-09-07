import type { Server as SocketIOServer, Socket } from 'socket.io';
import { z } from 'zod';
import { Meeting } from '../../database/models/Meeting.model';
import { WorkspaceMember } from '../../database/models/WorkspaceMember.model';
import { participantManager } from '../../media/managers/participant-manager';
import { logger } from '../../infrastructure/logging/logger';
import { Types } from 'mongoose';

const ModerateSchema = z.object({
  roomId: z.string().min(1),
  targetParticipantId: z.string().min(1),
  action: z.enum([
    'mute',
    'unmute',
    'camera-off',
    'camera-on',
    'disable-chat',
    'enable-chat',
    'kick',
  ]),
});

async function canModerateRoom(userId: string, roomId: string): Promise<boolean> {
  const meeting = await Meeting.findOne({ roomId }).lean();
  if (!meeting) return false;
  if (String(meeting.createdBy) === userId) return true;
  const member = await WorkspaceMember.findOne({
    workspaceId: meeting.workspaceId,
    userId: new Types.ObjectId(userId),
    status: 'active',
    role: { $in: ['owner', 'admin'] },
  }).lean();
  return Boolean(member);
}

export function registerModerationHandlers(io: SocketIOServer, socket: Socket): void {
  const user = socket.data.user as { userId: string; name: string };

  socket.on('host-moderate', async (payload: unknown, callback?: (res: unknown) => void) => {
    const parsed = ModerateSchema.safeParse(payload);
    if (!parsed.success) {
      callback?.({ error: 'Invalid moderation request' });
      return;
    }

    const { roomId, targetParticipantId, action } = parsed.data;
    const current = socket.data.currentRoom as { roomId: string; participantId: string } | undefined;
    if (!current || current.roomId !== roomId) {
      callback?.({ error: 'Not in this room' });
      return;
    }

    try {
      const allowed = await canModerateRoom(user.userId, roomId);
      if (!allowed) {
        callback?.({ error: 'Only the host or an admin can moderate participants.' });
        return;
      }

      const target = participantManager.getPeer(roomId, targetParticipantId);
      if (!target?.socketId) {
        callback?.({ error: 'Participant not found' });
        return;
      }

      io.to(target.socketId).emit('moderation-command', {
        action,
        by: user.name,
        targetParticipantId,
      });

      logger.info('Host moderation', { roomId, action, targetParticipantId, by: user.userId });
      callback?.({ success: true });
    } catch (err) {
      logger.error('host-moderate error', { err: String(err) });
      callback?.({ error: 'Moderation failed' });
    }
  });
}
