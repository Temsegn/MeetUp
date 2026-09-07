import mongoose, { Document, Schema } from 'mongoose';

export type MeetingParticipantStatus = 'invited' | 'registered' | 'joined';

export interface IMeetingParticipant extends Document {
  meetingId: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  avatarUrl: string | null;
  avatarColor: string | null;
  /** invited = host added them; registered = they opted in / joined preview; joined = entered live room */
  status: MeetingParticipantStatus;
  invitedBy: mongoose.Types.ObjectId | null;
  registeredAt: Date;
  joinedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const meetingParticipantSchema = new Schema<IMeetingParticipant>(
  {
    meetingId: { type: Schema.Types.ObjectId, ref: 'Meeting', required: true, index: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    avatarUrl: { type: String, default: null },
    avatarColor: { type: String, default: null },
    status: {
      type: String,
      enum: ['invited', 'registered', 'joined'],
      default: 'registered',
      index: true,
    },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    registeredAt: { type: Date, default: () => new Date() },
    joinedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

meetingParticipantSchema.index({ meetingId: 1, userId: 1 }, { unique: true });
meetingParticipantSchema.index({ userId: 1, workspaceId: 1, status: 1 });

export const MeetingParticipant = mongoose.model<IMeetingParticipant>(
  'MeetingParticipant',
  meetingParticipantSchema,
);
