import mongoose, { Document, Schema } from 'mongoose';
import type { MemberStatus, WorkspaceRole } from '../../modules/workspace/workspace.types';

export interface IWorkspaceMember extends Document {
  workspaceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: WorkspaceRole;
  status: MemberStatus;
  createdAt: Date;
  updatedAt: Date;
}

const workspaceMemberSchema = new Schema<IWorkspaceMember>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['owner', 'admin', 'member'], required: true, default: 'member' },
    status: { type: String, enum: ['active', 'inactive', 'invited', 'removed'], required: true, default: 'active' },
  },
  { timestamps: true },
);

workspaceMemberSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });

export const WorkspaceMember = mongoose.model<IWorkspaceMember>(
  'WorkspaceMember',
  workspaceMemberSchema,
);
