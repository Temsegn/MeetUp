import mongoose, { Document, Schema } from 'mongoose';

export type MessageKind = 'text' | 'voice' | 'system' | 'call';

export type CallStatus = 'completed' | 'missed' | 'rejected' | 'cancelled';

export interface IMessageAttachment {
  name: string;
  storageKey?: string;
  thumbKey?: string;
  sizeBytes: number;
  mimeType?: string;
  width?: number;
  height?: number;
  durationMs?: number;
}

export interface IMessageReaction {
  emoji: string;
  userIds: mongoose.Types.ObjectId[];
}

export interface IMessage extends Document {
  conversationId: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  /** Client-generated idempotency key */
  clientId?: string;
  kind: MessageKind;
  text: string;
  attachments: IMessageAttachment[];
  replyToId?: mongoose.Types.ObjectId | null;
  mentions: mongoose.Types.ObjectId[];
  reactions: IMessageReaction[];
  deliveredTo: mongoose.Types.ObjectId[];
  readBy: mongoose.Types.ObjectId[];
  editedAt?: Date | null;
  deletedAt?: Date | null;
  pinnedAt?: Date | null;
  pinnedBy?: mongoose.Types.ObjectId | null;
  /** When kind === 'call' */
  call?: {
    callType: 'audio' | 'video';
    status: CallStatus;
    durationSec?: number;
    startedAt?: Date;
    endedAt?: Date;
  } | null;
  /** Forwarded from another message */
  forwardedFromId?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const attachmentSchema = new Schema<IMessageAttachment>(
  {
    name: String,
    storageKey: String,
    thumbKey: String,
    sizeBytes: Number,
    mimeType: String,
    width: Number,
    height: Number,
    durationMs: Number,
  },
  { _id: false },
);

const reactionSchema = new Schema<IMessageReaction>(
  {
    emoji: { type: String, required: true },
    userIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { _id: false },
);

const messageSchema = new Schema<IMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    clientId: { type: String, index: true, sparse: true },
    kind: {
      type: String,
      enum: ['text', 'voice', 'system', 'call'],
      default: 'text',
    },
    text: { type: String, default: '' },
    attachments: [attachmentSchema],
    replyToId: { type: Schema.Types.ObjectId, ref: 'Message', default: null },
    mentions: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    reactions: [reactionSchema],
    deliveredTo: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    editedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
    pinnedAt: { type: Date, default: null },
    pinnedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    call: {
      type: {
        callType: { type: String, enum: ['audio', 'video'] },
        status: { type: String, enum: ['completed', 'missed', 'rejected', 'cancelled'] },
        durationSec: Number,
        startedAt: Date,
        endedAt: Date,
      },
      default: null,
    },
    forwardedFromId: { type: Schema.Types.ObjectId, ref: 'Message', default: null },
  },
  { timestamps: true },
);

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ conversationId: 1, clientId: 1 }, { unique: true, sparse: true });
messageSchema.index({ conversationId: 1, pinnedAt: -1 }, { sparse: true });
messageSchema.index({ workspaceId: 1, text: 'text' });
messageSchema.index({ conversationId: 1, deletedAt: 1, createdAt: -1 });

export const Message = mongoose.model<IMessage>('Message', messageSchema);
