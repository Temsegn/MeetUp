export type MeetingType = 'instant' | 'scheduled';

/** Plain record — services never see a Mongoose document. */
export interface MeetingRecord {
  id: string;
  roomId: string;
  createdBy: string;
  createdByName: string;
  type: MeetingType;
  title?: string;
  scheduledAt?: Date;
  duration?: number;
  createdAt: Date;
}

export interface ListMeetingsQuery {
  page: number;
  limit: number;
  type?: MeetingType;
}

export interface CreateMeetingInput {
  roomId: string;
  type: MeetingType;
  title?: string;
  scheduledAt?: Date;
  duration?: number;
  createdBy: string;
  createdByName: string;
}

/** JSON shape the current frontend expects (`_id`, ISO dates). */
export function toMeetingJson(m: MeetingRecord) {
  return {
    _id: m.id,
    roomId: m.roomId,
    createdBy: m.createdBy,
    createdByName: m.createdByName,
    type: m.type,
    title: m.title,
    scheduledAt: m.scheduledAt?.toISOString(),
    duration: m.duration,
    createdAt: m.createdAt.toISOString(),
  };
}
