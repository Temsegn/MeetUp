import mongoose, { Document, Schema } from 'mongoose';
import type { WorkspaceRole } from '../../modules/workspace/workspace.types';

export interface IWorkspaceInvite extends Document {
  workspaceId: mongoose.Types.ObjectId;
  email: string;
  name: string;
  phone: string;
  role: Exclude<WorkspaceRole, 'owner'>;
  tokenHash: string;
  invitedBy: mongoose.Types.ObjectId;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

const workspaceInviteSchema = new Schema<IWorkspaceInvite>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    name: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    role: { type: String, enum: ['admin', 'member'], required: true, default: 'member' },
    tokenHash: { type: String, required: true, unique: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const WorkspaceInvite = mongoose.model<IWorkspaceInvite>(
  'WorkspaceInvite',
  workspaceInviteSchema,
);
