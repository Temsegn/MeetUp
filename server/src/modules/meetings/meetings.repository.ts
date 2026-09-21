import { Types } from 'mongoose';
import { Meeting } from '../../database/models/Meeting.model';
import type { CreateMeetingInput, ListMeetingsQuery, MeetingRecord, MeetingType } from './meetings.types';

export interface MeetingDeps {
  listByCreator(userId: string, query: ListMeetingsQuery): Promise<{ meetings: MeetingRecord[]; total: number }>;
  upsertCreate(input: CreateMeetingInput): Promise<MeetingRecord>;
  deleteOwned(id: string, userId: string): Promise<MeetingRecord | null>;
  findByRoomId(roomId: string): Promise<MeetingRecord | null>;
}

function toRecord(doc: {
  _id: unknown;
  roomId: string;
  createdBy: unknown;
  createdByName: string;
  type: MeetingType;
  title?: string;
  scheduledAt?: Date;
  duration?: number;
  createdAt: Date;
}): MeetingRecord {
  return {
    id: String(doc._id),
    roomId: doc.roomId,
    createdBy: String(doc.createdBy),
    createdByName: doc.createdByName,
    type: doc.type,
    title: doc.title,
    scheduledAt: doc.scheduledAt,
    duration: doc.duration,
    createdAt: doc.createdAt,
  };
}

export const meetingRepository: MeetingDeps = {
  async listByCreator(userId, query) {
    const filter: Record<string, unknown> = { createdBy: new Types.ObjectId(userId) };
    if (query.type) filter.type = query.type;

    const skip = (query.page - 1) * query.limit;
    const [rows, total] = await Promise.all([
      Meeting.find(filter)
        .sort({ scheduledAt: 1, createdAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .lean(),
      Meeting.countDocuments(filter),
    ]);

    return { meetings: rows.map(toRecord), total };
  },

  async upsertCreate(input) {
    const doc = await Meeting.findOneAndUpdate(
      { roomId: input.roomId },
      {
        $setOnInsert: {
          roomId: input.roomId,
          createdBy: new Types.ObjectId(input.createdBy),
          createdByName: input.createdByName,
          type: input.type,
          title: input.title,
          scheduledAt: input.scheduledAt,
          duration: input.duration ?? 30,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return toRecord(doc);
  },

  async deleteOwned(id, userId) {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await Meeting.findOneAndDelete({
      _id: new Types.ObjectId(id),
      createdBy: new Types.ObjectId(userId),
    });
    return doc ? toRecord(doc) : null;
  },

  async findByRoomId(roomId) {
    const doc = await Meeting.findOne({ roomId }).lean();
    return doc ? toRecord(doc) : null;
  },
};
