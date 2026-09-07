import mongoose, { Document, Schema } from 'mongoose';
import {
  DEFAULT_WORKSPACE_SETTINGS,
  type WorkspaceSettings,
} from '../../modules/workspace/workspace.types';

export interface IWorkspace extends Document {
  name: string;
  slug: string;
  email: string;
  logoUrl: string | null;
  ownerId: mongoose.Types.ObjectId;
  settings: WorkspaceSettings;
  createdAt: Date;
  updatedAt: Date;
}

const workspaceSchema = new Schema<IWorkspace>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, default: '', trim: true, maxlength: 254 },
    logoUrl: { type: String, default: null },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    settings: {
      waitingRoom: { type: Boolean, default: DEFAULT_WORKSPACE_SETTINGS.waitingRoom },
      autoRecord: { type: Boolean, default: DEFAULT_WORKSPACE_SETTINGS.autoRecord },
      joinBeforeHost: { type: Boolean, default: DEFAULT_WORKSPACE_SETTINGS.joinBeforeHost },
      muteOnEntry: { type: Boolean, default: DEFAULT_WORKSPACE_SETTINGS.muteOnEntry },
      maxMeetingDurationMinutes: {
        type: Number,
        default: DEFAULT_WORKSPACE_SETTINGS.maxMeetingDurationMinutes,
      },
      language: { type: String, default: DEFAULT_WORKSPACE_SETTINGS.language, trim: true },
    },
  },
  { timestamps: true },
);

export const Workspace = mongoose.model<IWorkspace>('Workspace', workspaceSchema);
