import { Types } from 'mongoose';
import { Conversation } from '../../database/models/Conversation.model';
import {
  Message,
  type IMessage,
  type IMessageAttachment,
  type CallStatus,
} from '../../database/models/Message.model';
import { AppNotification } from '../../database/models/AppNotification.model';
import { ForbiddenError, NotFoundError, ValidationError } from '../../shared/errors/AppError';
import { authRepository } from '../auth/auth.repository';
import { logger } from '../../infrastructure/logging/logger';
import type { DmSendInput } from './messages.contracts';
import { assertNotSelfConversation, isSelfDirectConversation } from './messages.self-chat';

export type MessageDto = {
  id: string;
  conversationId: string;
  senderId: string;
  clientId?: string;
  kind: string;
  text: string;
  attachments: Array<IMessageAttachment & { url?: string; thumbUrl?: string }>;
  replyToId?: string | null;
  mentions: string[];
  reactions: Array<{ emoji: string; userIds: string[] }>;
  deliveredTo: string[];
  readBy: string[];
  editedAt?: string | null;
  deletedAt?: string | null;
  pinnedAt?: string | null;
  pinnedBy?: string | null;
  call?: {
    callType: 'audio' | 'video';
    status: CallStatus;
    durationSec?: number;
    startedAt?: string;
    endedAt?: string;
  } | null;
  forwardedFromId?: string | null;
  createdAt: string;
  updatedAt: string;
};

function fileUrl(key?: string): string | undefined {
  if (!key) return undefined;
  return `/messages/files?key=${encodeURIComponent(key)}`;
}

export function toMessageDto(m: IMessage | Record<string, unknown>): MessageDto {
  const doc = m as IMessage;
  const attachments = (doc.attachments ?? []).map((a) => ({
    name: a.name,
    storageKey: a.storageKey,
    thumbKey: a.thumbKey,
    sizeBytes: a.sizeBytes,
    mimeType: a.mimeType,
    width: a.width,
    height: a.height,
    durationMs: a.durationMs,
    url: fileUrl(a.storageKey),
    thumbUrl: fileUrl(a.thumbKey) ?? fileUrl(a.storageKey),
  }));

  return {
    id: String(doc._id),
    conversationId: String(doc.conversationId),
    senderId: String(doc.senderId),
    clientId: doc.clientId,
    kind: doc.kind ?? 'text',
    text: doc.deletedAt ? '' : doc.text ?? '',
    attachments: doc.deletedAt ? [] : attachments,
    replyToId: doc.replyToId ? String(doc.replyToId) : null,
    mentions: (doc.mentions ?? []).map(String),
    reactions: (doc.reactions ?? []).map((r) => ({
      emoji: r.emoji,
      userIds: (r.userIds ?? []).map(String),
    })),
    deliveredTo: (doc.deliveredTo ?? []).map(String),
    readBy: (doc.readBy ?? []).map(String),
    editedAt: doc.editedAt ? new Date(doc.editedAt).toISOString() : null,
    deletedAt: doc.deletedAt ? new Date(doc.deletedAt).toISOString() : null,
    pinnedAt: doc.pinnedAt ? new Date(doc.pinnedAt).toISOString() : null,
    pinnedBy: doc.pinnedBy ? String(doc.pinnedBy) : null,
    call: doc.call
      ? {
          callType: doc.call.callType,
          status: doc.call.status,
          durationSec: doc.call.durationSec,
          startedAt: doc.call.startedAt
            ? new Date(doc.call.startedAt).toISOString()
            : undefined,
          endedAt: doc.call.endedAt ? new Date(doc.call.endedAt).toISOString() : undefined,
        }
      : null,
    forwardedFromId: doc.forwardedFromId ? String(doc.forwardedFromId) : null,
    createdAt: new Date(doc.createdAt).toISOString(),
    updatedAt: new Date(doc.updatedAt ?? doc.createdAt).toISOString(),
  };
}

function previewFrom(text: string, attachments: IMessageAttachment[], kind: string): string {
  if (kind === 'call') return '📞 Call';
  if (kind === 'voice') return '🎤 Voice message';
  if (text.trim()) return text.trim().slice(0, 80);
  const first = attachments[0];
  if (!first) return '';
  if (first.mimeType?.startsWith('image/')) return '📷 Photo';
  if (first.mimeType?.startsWith('video/')) return '🎥 Video';
  if (first.mimeType?.startsWith('audio/')) return '🎵 Audio';
  return `📎 ${first.name}`;
}

/** Persist inbox notifications for every recipient except the sender. */
async function notifyDmRecipients(input: {
  conversationId: string;
  workspaceId: string;
  senderId: string;
  preview: string;
}): Promise<void> {
  try {
    const convo = await Conversation.findById(input.conversationId).select('memberIds').lean();
    if (!convo) return;
    const recipients = convo.memberIds
      .map(String)
      .filter((id) => id !== input.senderId);
    if (recipients.length === 0) return;

    const sender = await authRepository.findUserById(input.senderId);
    const title = sender?.name ? `${sender.name}` : 'New message';

    await AppNotification.insertMany(
      recipients.map((userId) => ({
        userId: new Types.ObjectId(userId),
        workspaceId: new Types.ObjectId(input.workspaceId),
        title,
        body: input.preview || 'Sent you a message',
        kind: 'message' as const,
        href: `/app/messages?c=${input.conversationId}`,
        meetingId: null,
      })),
    );
  } catch (err) {
    logger.warn('notifyDmRecipients failed', {
      err: err instanceof Error ? err.message : String(err),
      conversationId: input.conversationId,
    });
  }
}

export async function assertConversationMember(
  conversationId: string,
  workspaceId: string,
  userId: string,
) {
  if (!Types.ObjectId.isValid(conversationId)) throw new NotFoundError('Conversation');
  const convo = await Conversation.findById(conversationId).lean();
  if (!convo) throw new NotFoundError('Conversation');
  if (String(convo.workspaceId) !== workspaceId) throw new ForbiddenError();
  if (!convo.memberIds.some((id) => String(id) === userId)) throw new ForbiddenError();
  if (isSelfDirectConversation(convo.type, convo.memberIds, userId)) {
    throw new ForbiddenError('Self-chat is not allowed');
  }
  return convo;
}

export const messagesService = {
  async listMessages(
    conversationId: string,
    opts: { limit?: number; before?: string; after?: string } = {},
  ) {
    const limit = Math.min(opts.limit ?? 40, 100);
    const filter: Record<string, unknown> = {
      conversationId: new Types.ObjectId(conversationId),
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    };
    if (opts.before) filter.createdAt = { ...(filter.createdAt as object), $lt: new Date(opts.before) };
    if (opts.after) filter.createdAt = { ...(filter.createdAt as object), $gt: new Date(opts.after) };

    const msgs = await Message.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
    return msgs.reverse().map((m) => toMessageDto(m as unknown as IMessage));
  },

  async sendMessage(
    input: DmSendInput & { workspaceId: string; senderId: string },
  ): Promise<MessageDto> {
    await assertNotSelfConversation(input.conversationId, input.senderId);

    const text = (input.text ?? '').trim();
    const attachments = input.attachments ?? [];
    const kind = input.kind ?? (attachments.some((a) => a.mimeType?.startsWith('audio/') && a.durationMs)
      ? 'voice'
      : 'text');

    if (!text && attachments.length === 0) {
      throw new ValidationError('Message text or attachment required', 'EMPTY_MESSAGE');
    }

    if (input.clientId) {
      const existing = await Message.findOne({
        conversationId: new Types.ObjectId(input.conversationId),
        clientId: input.clientId,
      }).lean();
      if (existing) return toMessageDto(existing as unknown as IMessage);
    }

    const senderOid = new Types.ObjectId(input.senderId);
    const msg = await Message.create({
      conversationId: new Types.ObjectId(input.conversationId),
      workspaceId: new Types.ObjectId(input.workspaceId),
      senderId: senderOid,
      clientId: input.clientId,
      kind,
      text,
      attachments,
      replyToId: input.replyToId ? new Types.ObjectId(input.replyToId) : null,
      mentions: (input.mentions ?? []).map((id) => new Types.ObjectId(id)),
      reactions: [],
      deliveredTo: [senderOid],
      readBy: [senderOid],
    });

    await Conversation.findByIdAndUpdate(input.conversationId, {
      $set: {
        lastMessageAt: msg.createdAt,
        preview: previewFrom(text, attachments, kind),
      },
    });

    const dto = toMessageDto(msg);
    void notifyDmRecipients({
      conversationId: input.conversationId,
      workspaceId: input.workspaceId,
      senderId: input.senderId,
      preview: previewFrom(text, attachments, kind) || 'New message',
    });
    return dto;
  },

  async editMessage(conversationId: string, messageId: string, userId: string, text: string) {
    const msg = await Message.findOne({
      _id: messageId,
      conversationId,
      deletedAt: null,
    });
    if (!msg) throw new NotFoundError('Message');
    if (String(msg.senderId) !== userId) throw new ForbiddenError();
    if (msg.kind === 'call' || msg.kind === 'system') {
      throw new ValidationError('Cannot edit this message', 'NOT_EDITABLE');
    }
    msg.text = text.trim();
    msg.editedAt = new Date();
    await msg.save();
    return toMessageDto(msg);
  },

  async deleteMessage(conversationId: string, messageId: string, userId: string) {
    const msg = await Message.findOne({ _id: messageId, conversationId });
    if (!msg) throw new NotFoundError('Message');
    if (String(msg.senderId) !== userId) throw new ForbiddenError();
    msg.deletedAt = new Date();
    msg.text = '';
    msg.attachments = [];
    await msg.save();
    return toMessageDto(msg);
  },

  async react(conversationId: string, messageId: string, userId: string, emoji: string) {
    const msg = await Message.findOne({ _id: messageId, conversationId, deletedAt: null });
    if (!msg) throw new NotFoundError('Message');
    const uid = new Types.ObjectId(userId);
    const existing = msg.reactions.find((r) => r.emoji === emoji);
    if (existing) {
      const idx = existing.userIds.findIndex((id) => String(id) === userId);
      if (idx >= 0) existing.userIds.splice(idx, 1);
      else existing.userIds.push(uid);
      if (existing.userIds.length === 0) {
        msg.reactions = msg.reactions.filter((r) => r.emoji !== emoji);
      }
    } else {
      msg.reactions.push({ emoji, userIds: [uid] });
    }
    await msg.save();
    return toMessageDto(msg);
  },

  async pin(conversationId: string, messageId: string, userId: string, pinned: boolean) {
    const msg = await Message.findOne({ _id: messageId, conversationId, deletedAt: null });
    if (!msg) throw new NotFoundError('Message');
    msg.pinnedAt = pinned ? new Date() : null;
    msg.pinnedBy = pinned ? new Types.ObjectId(userId) : null;
    await msg.save();
    return toMessageDto(msg);
  },

  async forward(opts: {
    sourceConversationId: string;
    messageId: string;
    targetConversationId: string;
    workspaceId: string;
    senderId: string;
    clientId?: string;
  }) {
    const source = await Message.findOne({
      _id: opts.messageId,
      conversationId: opts.sourceConversationId,
      deletedAt: null,
    }).lean();
    if (!source) throw new NotFoundError('Message');

    return this.sendMessage({
      conversationId: opts.targetConversationId,
      workspaceId: opts.workspaceId,
      senderId: opts.senderId,
      clientId: opts.clientId,
      text: source.text || '',
      kind: source.kind === 'voice' ? 'voice' : 'text',
      attachments: (source.attachments ?? []).map((a) => ({
        name: a.name,
        mimeType: a.mimeType ?? 'application/octet-stream',
        storageKey: a.storageKey ?? '',
        sizeBytes: a.sizeBytes ?? 0,
        thumbKey: a.thumbKey,
        durationMs: a.durationMs,
        width: a.width,
        height: a.height,
      })).filter((a) => a.storageKey),
    }).then(async (dto) => {
      await Message.updateOne(
        { _id: dto.id },
        { $set: { forwardedFromId: source._id } },
      );
      const updated = await Message.findById(dto.id);
      return updated ? toMessageDto(updated) : dto;
    });
  },

  async markDelivered(conversationId: string, messageIds: string[], userId: string) {
    if (messageIds.length === 0) return [] as string[];
    const uid = new Types.ObjectId(userId);
    await Message.updateMany(
      {
        _id: { $in: messageIds.map((id) => new Types.ObjectId(id)) },
        conversationId: new Types.ObjectId(conversationId),
        deliveredTo: { $ne: uid },
      },
      { $addToSet: { deliveredTo: uid } },
    );
    return messageIds;
  },

  async markRead(conversationId: string, messageIds: string[], userId: string) {
    if (messageIds.length === 0) return [] as string[];
    const uid = new Types.ObjectId(userId);
    await Message.updateMany(
      {
        _id: { $in: messageIds.map((id) => new Types.ObjectId(id)) },
        conversationId: new Types.ObjectId(conversationId),
      },
      { $addToSet: { deliveredTo: uid, readBy: uid } },
    );
    return messageIds;
  },

  async recordCall(opts: {
    conversationId: string;
    workspaceId: string;
    senderId: string;
    callType: 'audio' | 'video';
    status: CallStatus;
    durationSec?: number;
  }) {
    const senderOid = new Types.ObjectId(opts.senderId);
    const now = new Date();
    const msg = await Message.create({
      conversationId: new Types.ObjectId(opts.conversationId),
      workspaceId: new Types.ObjectId(opts.workspaceId),
      senderId: senderOid,
      kind: 'call',
      text: '',
      attachments: [],
      deliveredTo: [senderOid],
      readBy: [senderOid],
      call: {
        callType: opts.callType,
        status: opts.status,
        durationSec: opts.durationSec,
        startedAt: now,
        endedAt: now,
      },
    });
    await Conversation.findByIdAndUpdate(opts.conversationId, {
      $set: {
        lastMessageAt: msg.createdAt,
        preview:
          opts.status === 'missed'
            ? 'Missed call'
            : opts.status === 'rejected'
              ? 'Declined call'
              : opts.callType === 'video'
                ? 'Video call'
                : 'Voice call',
      },
    });
    return toMessageDto(msg);
  },

  async search(workspaceId: string, userId: string, q: string, conversationId?: string) {
    const query = q.trim();
    if (query.length < 2) return [] as MessageDto[];

    const memberConvos = await Conversation.find({
      workspaceId: new Types.ObjectId(workspaceId),
      memberIds: new Types.ObjectId(userId),
      ...(conversationId ? { _id: new Types.ObjectId(conversationId) } : {}),
    })
      .select('_id')
      .lean();
    const ids = memberConvos.map((c) => c._id);
    if (ids.length === 0) return [];

    const msgs = await Message.find({
      conversationId: { $in: ids },
      deletedAt: null,
      text: { $regex: query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
    })
      .sort({ createdAt: -1 })
      .limit(40)
      .lean();

    return msgs.map((m) => toMessageDto(m as unknown as IMessage));
  },
};
