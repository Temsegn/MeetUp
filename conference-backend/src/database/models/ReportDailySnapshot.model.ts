import mongoose, { Document, Schema } from 'mongoose';

export interface IReportDailySnapshot extends Document {
  workspaceId: mongoose.Types.ObjectId;
  dateKey: string;
  meetingCount: number;
  totalMinutes: number;
  participantMinutes: number;
  participantCount: number;
  recordingCount: number;
  createdAt: Date;
}

const reportDailySnapshotSchema = new Schema<IReportDailySnapshot>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    dateKey: { type: String, required: true },
    meetingCount: { type: Number, default: 0 },
    totalMinutes: { type: Number, default: 0 },
    participantMinutes: { type: Number, default: 0 },
    participantCount: { type: Number, default: 0 },
    recordingCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

reportDailySnapshotSchema.index({ workspaceId: 1, dateKey: 1 }, { unique: true });

export const ReportDailySnapshot = mongoose.model<IReportDailySnapshot>(
  'ReportDailySnapshot',
  reportDailySnapshotSchema,
);
