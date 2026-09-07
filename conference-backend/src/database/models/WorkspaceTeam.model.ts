import mongoose, { Document, Schema } from 'mongoose';

export type WorkspaceTeamStatus = 'active' | 'inactive' | 'pending';

export interface IWorkspaceTeam extends Document {
  workspaceId: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  department: string;
  visibility: 'workspace' | 'private';
  leadUserId: mongoose.Types.ObjectId | null;
  memberIds: mongoose.Types.ObjectId[];
  imageUrl: string | null;
  settings: {
    membersCanInvite: boolean;
    requireJoinApproval: boolean;
    notifyOnChanges: boolean;
    canCreateMeetings: boolean;
  };
  status: WorkspaceTeamStatus;
  accent: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const workspaceTeamSchema = new Schema<IWorkspaceTeam>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 64 },
    description: { type: String, default: '', maxlength: 150 },
    department: { type: String, default: '' },
    visibility: { type: String, enum: ['workspace', 'private'], default: 'workspace' },
    leadUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    memberIds: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] },
    imageUrl: { type: String, default: null },
    settings: {
      membersCanInvite: { type: Boolean, default: true },
      requireJoinApproval: { type: Boolean, default: false },
      notifyOnChanges: { type: Boolean, default: true },
      canCreateMeetings: { type: Boolean, default: true },
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending'],
      default: 'active',
    },
    accent: { type: String, default: '#016BE6' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

workspaceTeamSchema.index({ workspaceId: 1, slug: 1 }, { unique: true });
workspaceTeamSchema.index({ workspaceId: 1, status: 1 });

export const WorkspaceTeam = mongoose.model<IWorkspaceTeam>(
  'WorkspaceTeam',
  workspaceTeamSchema,
);
