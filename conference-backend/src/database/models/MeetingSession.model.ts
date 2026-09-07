import mongoose, { Document, Schema } from 'mongoose';

export interface IMeetingSession extends Document {
  workspaceId: mongoose.Types.ObjectId;
  meetingId: mongoose.Types.ObjectId | null;
  roomId: string;
  startedAt: Date;
  endedAt: Date | null;
  participantCount: number;
  peakParticipants: number;
  createdAt: Date;
  updatedAt: Date;
}

const meetingSessionSchema = new Schema<IMeetingSession>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    meetingId: { type: Schema.Types.ObjectId, ref: 'Meeting', default: null, index: true },
    roomId: { type: String, required: true, index: true },
    startedAt: { type: Date, required: true, default: Date.now },
    endedAt: { type: Date, default: null },
    participantCount: { type: Number, default: 0 },
    peakParticipants: { type: Number, default: 0 },
  },
  { timestamps: true },
);

meetingSessionSchema.index({ roomId: 1, endedAt: 1 });

export const MeetingSession = mongoose.model<IMeetingSession>('MeetingSession', meetingSessionSchema);
