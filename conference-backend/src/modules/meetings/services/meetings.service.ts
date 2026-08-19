import { NotFoundError } from '../../../shared/errors/AppError';
import { meetingRepository, MeetingDeps } from '../meetings.repository';
import type { CreateMeetingBody } from '../meetings.validation';
import type { ListMeetingsQuery, MeetingRecord } from '../meetings.types';

export function createMeetingsService(deps: MeetingDeps = meetingRepository) {
  return {
    async list(userId: string, query: ListMeetingsQuery) {
      return deps.listByCreator(userId, query);
    },

    async create(userId: string, userName: string, body: CreateMeetingBody): Promise<MeetingRecord> {
      return deps.upsertCreate({
        roomId: body.roomId,
        type: body.type,
        title: body.title,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        duration: body.duration,
        createdBy: userId,
        createdByName: userName,
      });
    },

    async deleteOwned(id: string, userId: string): Promise<MeetingRecord> {
      const meeting = await deps.deleteOwned(id, userId);
      if (!meeting) {
        throw new NotFoundError('Meeting');
      }
      return meeting;
    },

    async findByRoomId(roomId: string): Promise<MeetingRecord | null> {
      return deps.findByRoomId(roomId);
    },
  };
}

export const meetingsService = createMeetingsService();
