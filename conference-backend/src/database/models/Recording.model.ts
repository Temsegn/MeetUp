import mongoose, { Document, Schema } from 'mongoose';

export type RecordingSource = 'client_composite' | 'server_sfu' | 'server_track';
export type RecordingStatus = 'processing' | 'ready' | 'failed';

export interface IRecordingParticipant {
  userId: string;
  name: string;
  avatarUrl?: string | null;
}

export interface IRecording extends Document {
  workspaceId: mongoose.Types.ObjectId;
  meetingId: mongoose.Types.ObjectId | null;
  sessionId: mongoose.Types.ObjectId | null;
  roomId: string;
  recordingId: string;
  title: string;
  description: string;
  source: RecordingSource;
  storageKey: string;
  filename: string;
  mimeType: string;
  bytes: number;
  durationSeconds: number;
  views: number;
  sharedBy: mongoose.Types.ObjectId;
  participants: IRecordingParticipant[];
  status: RecordingStatus;
  createdAt: Date;
  updatedAt: Date;
}

const recordingSchema = new Schema<IRecording>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    meetingId: { type: Schema.Types.ObjectId, ref: 'Meeting', default: null, index: true },
    sessionId: { type: Schema.Types.ObjectId, ref: 'MeetingSession', default: null },
    roomId: { type: String, required: true, index: true },
    recordingId: { type: String, required: true, unique: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    source: {
      type: String,
      enum: ['client_composite', 'server_sfu', 'server_track'],
      default: 'client_composite',
    },
    storageKey: { type: String, required: true },
    filename: { type: String, required: true },
    mimeType: { type: String, default: 'video/mp4' },
    bytes: { type: Number, default: 0 },
    durationSeconds: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    sharedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    participants: [
      {
        userId: String,
        name: String,
        avatarUrl: String,
      },
    ],
    status: { type: String, enum: ['processing', 'ready', 'failed'], default: 'ready' },
  },
  { timestamps: true },
);

recordingSchema.index({ workspaceId: 1, createdAt: -1 });

export const Recording = mongoose.model<IRecording>('Recording', recordingSchema);
