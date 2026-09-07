import mongoose, { Document, Schema } from 'mongoose';

export type AppNotificationKind = 'message' | 'meeting' | 'workspace' | 'system';

export interface IAppNotification extends Document {
  userId: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId | null;
  title: string;
  body: string;
  kind: AppNotificationKind;
  href: string | null;
  meetingId: mongoose.Types.ObjectId | null;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const appNotificationSchema = new Schema<IAppNotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', default: null, index: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    kind: {
      type: String,
      enum: ['message', 'meeting', 'workspace', 'system'],
      default: 'system',
      index: true,
    },
    href: { type: String, default: null },
    meetingId: { type: Schema.Types.ObjectId, ref: 'Meeting', default: null, index: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

appNotificationSchema.index({ userId: 1, createdAt: -1 });
appNotificationSchema.index({ userId: 1, readAt: 1 });

export const AppNotification = mongoose.model<IAppNotification>(
  'AppNotification',
  appNotificationSchema,
);
