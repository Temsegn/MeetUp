import mongoose, { Document, Schema } from 'mongoose';

export type ConversationType = 'direct' | 'group';

export interface IConversation extends Document {
  workspaceId: mongoose.Types.ObjectId;
  type: ConversationType;
  name?: string;
  memberIds: mongoose.Types.ObjectId[];
  lastMessageAt: Date;
  preview: string;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    type: { type: String, enum: ['direct', 'group'], required: true },
    name: { type: String, trim: true },
    memberIds: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    lastMessageAt: { type: Date, default: Date.now },
    preview: { type: String, default: '' },
  },
  { timestamps: true },
);

conversationSchema.index({ workspaceId: 1, memberIds: 1 });

export const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema);
