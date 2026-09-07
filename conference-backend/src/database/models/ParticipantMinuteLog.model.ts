import mongoose, { Document, Schema } from 'mongoose';

export interface IParticipantMinuteLog extends Document {
  workspaceId: mongoose.Types.ObjectId;
  meetingId: mongoose.Types.ObjectId | null;
  sessionId: mongoose.Types.ObjectId | null;
  roomId: string;
  userId: mongoose.Types.ObjectId;
  joinedAt: Date;
  leftAt: Date;
  durationSeconds: number;
  participantMinutes: number;
  billedAt: Date | null;
  createdAt: Date;
}

const participantMinuteLogSchema = new Schema<IParticipantMinuteLog>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    meetingId: { type: Schema.Types.ObjectId, ref: 'Meeting', default: null, index: true },
    sessionId: { type: Schema.Types.ObjectId, ref: 'MeetingSession', default: null },
    roomId: { type: String, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    joinedAt: { type: Date, required: true },
    leftAt: { type: Date, required: true },
    durationSeconds: { type: Number, required: true },
    participantMinutes: { type: Number, required: true },
    billedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

participantMinuteLogSchema.index({ workspaceId: 1, createdAt: -1 });

export const ParticipantMinuteLog = mongoose.model<IParticipantMinuteLog>(
  'ParticipantMinuteLog',
  participantMinuteLogSchema,
);
