import mongoose, { Document, Schema } from 'mongoose';

export type WorkspaceRoomStatus = 'active' | 'inactive' | 'pending';

export interface IWorkspaceRoom extends Document {
  workspaceId: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  capacity: number;
  roomType: string;
  department: string;
  tags: string[];
  imageUrl: string | null;
  memberIds: mongoose.Types.ObjectId[];
  settings: {
    allowRecording: boolean;
    allowChat: boolean;
    screenSharing: boolean;
    fileSharing: boolean;
    waitingRoom: boolean;
    roomApproval: boolean;
  };
  status: WorkspaceRoomStatus;
  accent: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const workspaceRoomSchema = new Schema<IWorkspaceRoom>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 64 },
    description: { type: String, default: '', maxlength: 150 },
    capacity: { type: Number, required: true, min: 1, max: 10000 },
    roomType: { type: String, default: '' },
    department: { type: String, default: '' },
    tags: { type: [String], default: [] },
    imageUrl: { type: String, default: null },
    memberIds: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] },
    settings: {
      allowRecording: { type: Boolean, default: true },
      allowChat: { type: Boolean, default: true },
      screenSharing: { type: Boolean, default: true },
      fileSharing: { type: Boolean, default: true },
      waitingRoom: { type: Boolean, default: false },
      roomApproval: { type: Boolean, default: false },
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending'],
      default: 'active',
    },
    accent: { type: String, default: '#3B82F6' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

workspaceRoomSchema.index({ workspaceId: 1, slug: 1 }, { unique: true });
workspaceRoomSchema.index({ workspaceId: 1, status: 1 });

export const WorkspaceRoom = mongoose.model<IWorkspaceRoom>(
  'WorkspaceRoom',
  workspaceRoomSchema,
);
