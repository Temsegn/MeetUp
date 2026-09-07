import { Server as SocketIOServer, Socket } from 'socket.io';
import { Types } from 'mongoose';
import { Conversation } from '../../database/models/Conversation.model';
import { logger } from '../../infrastructure/logging/logger';
import { validatePayload } from '../../shared/validation/socket.schemas';
import {
  DmCallHangupSchema,
  DmCallInviteSchema,
  DmCallPeerSchema,
  DmCallSignalSchema,
  DmDeleteSchema,
  DmDeliveredSchema,
  DmEditSchema,
  DmForwardSchema,
  DmJoinSchema,
  DmLeaveSchema,
  DmPinSchema,
  DmReactSchema,
  DmReadSchema,
  DmSendSchema,
  DmTypingSchema,
} from './messages.contracts';
import { DM_EVENTS, dmRoom, userRoom } from './messages.events';
import { messagesService, type MessageDto } from './messages.service';
import { assertNotSelfConversation, isSelfDirectConversation } from './messages.self-chat';

type Callback = (res: unknown) => void;

let ioRef: SocketIOServer | null = null;
const onlineSockets = new Map<string, Set<string>>();

const RATE_WINDOW_MS = 1000;
const MAX_SEND_PER_WINDOW = 8;
const rateState = new Map<string, { count: number; start: number }>();

function rateLimited(socketId: string): boolean {
  const now = Date.now();
  const s = rateState.get(socketId) ?? { count: 0, start: now };
  if (now - s.start > RATE_WINDOW_MS) {
    s.count = 1;
    s.start = now;
    rateState.set(socketId, s);
    return false;
  }
  s.count += 1;
  rateState.set(socketId, s);
  return s.count > MAX_SEND_PER_WINDOW;
}

export function bindMessagesIo(io: SocketIOServer): void {
  ioRef = io;
}

export function getMessagesIo(): SocketIOServer | null {
  return ioRef;
}

export function isUserOnline(userId: string): boolean {
  return (onlineSockets.get(userId)?.size ?? 0) > 0;
}

export function emitDmMessage(conversationId: string, message: MessageDto): void {
  ioRef?.to(dmRoom(conversationId)).emit(DM_EVENTS.MESSAGE, message);
}

export function emitDmUpdate(conversationId: string, message: MessageDto): void {
  ioRef?.to(dmRoom(conversationId)).emit(DM_EVENTS.MESSAGE_UPDATE, message);
}

/** Broadcast receipt to conversation room + every member's personal room (realtime ticks). */
async function emitToConversationMembers(
  conversationId: string,
  event: string,
  payload: unknown,
  excludeUserId?: string,
): Promise<void> {
  if (!ioRef) return;
  ioRef.to(dmRoom(conversationId)).emit(event, payload);
  const convo = await Conversation.findById(conversationId).select('memberIds').lean();
  for (const mid of convo?.memberIds ?? []) {
    const id = String(mid);
    if (excludeUserId && id === excludeUserId) continue;
    ioRef.to(userRoom(id)).emit(event, payload);
  }
}

export async function emitDmRead(
  conversationId: string,
  messageIds: string[],
  readerId: string,
): Promise<void> {
  if (messageIds.length === 0) return;
  await emitToConversationMembers(conversationId, DM_EVENTS.READ, {
    conversationId,
    messageIds,
    readerId,
  });
}

export async function emitDmDelivered(
  conversationId: string,
  messageIds: string[],
  userId: string,
): Promise<void> {
  if (messageIds.length === 0) return;
  await emitToConversationMembers(conversationId, DM_EVENTS.DELIVERED, {
    conversationId,
    messageIds,
    userId,
  });
}

function trackOnline(userId: string, socketId: string): void {
  let set = onlineSockets.get(userId);
  if (!set) {
    set = new Set();
    onlineSockets.set(userId, set);
  }
  set.add(socketId);
}

function trackOffline(userId: string, socketId: string): void {
  const set = onlineSockets.get(userId);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) onlineSockets.delete(userId);
}

async function memberOk(conversationId: string, userId: string): Promise<boolean> {
  if (!Types.ObjectId.isValid(conversationId)) return false;
  const convo = await Conversation.findById(conversationId).select('memberIds type').lean();
  if (!convo) return false;
  if (!convo.memberIds.some((id) => String(id) === userId)) return false;
  if (isSelfDirectConversation(convo.type, convo.memberIds, userId)) return false;
  return true;
}

function fail(callback: Callback | undefined, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  const code =
    err && typeof err === 'object' && 'code' in err
      ? String((err as { code: unknown }).code)
      : 'INTERNAL_ERROR';
  callback?.({ error: message, code });
}

export function registerMessagesHandlers(io: SocketIOServer, socket: Socket): void {
  const user = socket.data.user as { userId: string; name: string; isGuest?: boolean };
  if (user.isGuest) return;

  trackOnline(user.userId, socket.id);
  void socket.join(userRoom(user.userId));
  io.emit(DM_EVENTS.PRESENCE, { userId: user.userId, online: true });

  socket.on(DM_EVENTS.JOIN, async (payload: unknown, callback?: Callback) => {
    try {
      const v = validatePayload(DmJoinSchema, payload);
      if (!v.success) return callback?.({ error: v.error, code: 'VALIDATION_ERROR' });
      const { conversationId, since } = v.data;
      if (!(await memberOk(conversationId, user.userId))) {
        return callback?.({ error: 'Self-chat is not allowed', code: 'SELF_CHAT_NOT_ALLOWED' });
      }
      try {
        await assertNotSelfConversation(conversationId, user.userId);
      } catch {
        return callback?.({ error: 'Self-chat is not allowed', code: 'SELF_CHAT_NOT_ALLOWED' });
      }
      await socket.join(dmRoom(conversationId));
      const messages = since
        ? await messagesService.listMessages(conversationId, { after: since, limit: 100 })
        : [];
      callback?.({ ok: true, messages });
    } catch (err) {
      logger.error('dm:join failed', { err });
      fail(callback, err);
    }
  });

  socket.on(DM_EVENTS.LEAVE, async (payload: unknown, callback?: Callback) => {
    const v = validatePayload(DmLeaveSchema, payload);
    if (!v.success) return callback?.({ error: v.error, code: 'VALIDATION_ERROR' });
    await socket.leave(dmRoom(v.data.conversationId));
    callback?.({ ok: true });
  });

  socket.on(DM_EVENTS.SEND, async (payload: unknown, callback?: Callback) => {
    try {
      if (rateLimited(socket.id)) {
        return callback?.({ error: 'Too many messages', code: 'RATE_LIMITED' });
      }
      const v = validatePayload(DmSendSchema, payload);
      if (!v.success) return callback?.({ error: v.error, code: 'VALIDATION_ERROR' });
      if (!(await memberOk(v.data.conversationId, user.userId))) {
        return callback?.({ error: 'Self-chat is not allowed', code: 'SELF_CHAT_NOT_ALLOWED' });
      }
      const convo = await Conversation.findById(v.data.conversationId).select('workspaceId').lean();
      if (!convo) return callback?.({ error: 'Not found', code: 'NOT_FOUND' });

      const message = await messagesService.sendMessage({
        ...v.data,
        workspaceId: String(convo.workspaceId),
        senderId: user.userId,
      });
      io.to(dmRoom(v.data.conversationId)).emit(DM_EVENTS.MESSAGE, message);
      const full = await Conversation.findById(v.data.conversationId).select('memberIds').lean();
      for (const mid of full?.memberIds ?? []) {
        const id = String(mid);
        if (id === user.userId) continue;
        io.to(userRoom(id)).emit(DM_EVENTS.MESSAGE, message);
      }
      callback?.({ message });
    } catch (err) {
      logger.error('dm:send failed', { err });
      fail(callback, err);
    }
  });

  socket.on(DM_EVENTS.EDIT, async (payload: unknown, callback?: Callback) => {
    try {
      const v = validatePayload(DmEditSchema, payload);
      if (!v.success) return callback?.({ error: v.error, code: 'VALIDATION_ERROR' });
      if (!(await memberOk(v.data.conversationId, user.userId))) {
        return callback?.({ error: 'Forbidden', code: 'FORBIDDEN' });
      }
      const message = await messagesService.editMessage(
        v.data.conversationId,
        v.data.messageId,
        user.userId,
        v.data.text,
      );
      io.to(dmRoom(v.data.conversationId)).emit(DM_EVENTS.MESSAGE_UPDATE, message);
      callback?.({ message });
    } catch (err) {
      fail(callback, err);
    }
  });

  socket.on(DM_EVENTS.DELETE, async (payload: unknown, callback?: Callback) => {
    try {
      const v = validatePayload(DmDeleteSchema, payload);
      if (!v.success) return callback?.({ error: v.error, code: 'VALIDATION_ERROR' });
      if (!(await memberOk(v.data.conversationId, user.userId))) {
        return callback?.({ error: 'Forbidden', code: 'FORBIDDEN' });
      }
      const message = await messagesService.deleteMessage(
        v.data.conversationId,
        v.data.messageId,
        user.userId,
      );
      io.to(dmRoom(v.data.conversationId)).emit(DM_EVENTS.MESSAGE_UPDATE, message);
      callback?.({ message });
    } catch (err) {
      fail(callback, err);
    }
  });

  socket.on(DM_EVENTS.REACT, async (payload: unknown, callback?: Callback) => {
    try {
      const v = validatePayload(DmReactSchema, payload);
      if (!v.success) return callback?.({ error: v.error, code: 'VALIDATION_ERROR' });
      if (!(await memberOk(v.data.conversationId, user.userId))) {
        return callback?.({ error: 'Forbidden', code: 'FORBIDDEN' });
      }
      const message = await messagesService.react(
        v.data.conversationId,
        v.data.messageId,
        user.userId,
        v.data.emoji,
      );
      io.to(dmRoom(v.data.conversationId)).emit(DM_EVENTS.MESSAGE_UPDATE, message);
      callback?.({ message });
    } catch (err) {
      fail(callback, err);
    }
  });

  socket.on(DM_EVENTS.PIN, async (payload: unknown, callback?: Callback) => {
    try {
      const v = validatePayload(DmPinSchema, payload);
      if (!v.success) return callback?.({ error: v.error, code: 'VALIDATION_ERROR' });
      if (!(await memberOk(v.data.conversationId, user.userId))) {
        return callback?.({ error: 'Forbidden', code: 'FORBIDDEN' });
      }
      const message = await messagesService.pin(
        v.data.conversationId,
        v.data.messageId,
        user.userId,
        v.data.pinned,
      );
      io.to(dmRoom(v.data.conversationId)).emit(DM_EVENTS.MESSAGE_UPDATE, message);
      callback?.({ message });
    } catch (err) {
      fail(callback, err);
    }
  });

  socket.on(DM_EVENTS.FORWARD, async (payload: unknown, callback?: Callback) => {
    try {
      const v = validatePayload(DmForwardSchema, payload);
      if (!v.success) return callback?.({ error: v.error, code: 'VALIDATION_ERROR' });
      if (
        !(await memberOk(v.data.sourceConversationId, user.userId)) ||
        !(await memberOk(v.data.targetConversationId, user.userId))
      ) {
        return callback?.({ error: 'Forbidden', code: 'FORBIDDEN' });
      }
      const convo = await Conversation.findById(v.data.targetConversationId)
        .select('workspaceId')
        .lean();
      if (!convo) return callback?.({ error: 'Not found', code: 'NOT_FOUND' });
      const message = await messagesService.forward({
        ...v.data,
        workspaceId: String(convo.workspaceId),
        senderId: user.userId,
      });
      io.to(dmRoom(v.data.targetConversationId)).emit(DM_EVENTS.MESSAGE, message);
      callback?.({ message });
    } catch (err) {
      fail(callback, err);
    }
  });

  socket.on(DM_EVENTS.READ, async (payload: unknown, callback?: Callback) => {
    try {
      const v = validatePayload(DmReadSchema, payload);
      if (!v.success) return callback?.({ error: v.error, code: 'VALIDATION_ERROR' });
      if (!(await memberOk(v.data.conversationId, user.userId))) {
        return callback?.({ error: 'Forbidden', code: 'FORBIDDEN' });
      }
      const ids = await messagesService.markRead(
        v.data.conversationId,
        v.data.messageIds,
        user.userId,
      );
      await emitDmRead(v.data.conversationId, ids, user.userId);
      callback?.({ ok: true });
    } catch (err) {
      fail(callback, err);
    }
  });

  socket.on(DM_EVENTS.DELIVERED, async (payload: unknown, callback?: Callback) => {
    try {
      const v = validatePayload(DmDeliveredSchema, payload);
      if (!v.success) return callback?.({ error: v.error, code: 'VALIDATION_ERROR' });
      if (!(await memberOk(v.data.conversationId, user.userId))) {
        return callback?.({ error: 'Forbidden', code: 'FORBIDDEN' });
      }
      const ids = await messagesService.markDelivered(
        v.data.conversationId,
        v.data.messageIds,
        user.userId,
      );
      await emitDmDelivered(v.data.conversationId, ids, user.userId);
      callback?.({ ok: true });
    } catch (err) {
      fail(callback, err);
    }
  });

  socket.on(DM_EVENTS.TYPING, async (payload: unknown) => {
    const v = validatePayload(DmTypingSchema, payload);
    if (!v.success) return;
    if (!(await memberOk(v.data.conversationId, user.userId))) return;
    socket.to(dmRoom(v.data.conversationId)).emit(DM_EVENTS.TYPING, {
      conversationId: v.data.conversationId,
      userId: user.userId,
      name: user.name,
      typing: v.data.typing,
    });
  });

  const forwardCall = async (
    event: string,
    schema: typeof DmCallInviteSchema | typeof DmCallPeerSchema | typeof DmCallSignalSchema | typeof DmCallHangupSchema,
    payload: unknown,
    callback?: Callback,
  ) => {
    try {
      const v = validatePayload(schema, payload);
      if (!v.success) return callback?.({ error: v.error, code: 'VALIDATION_ERROR' });
      const data = v.data as {
        conversationId: string;
        toUserId: string;
        callId: string;
        [k: string]: unknown;
      };
      if (!(await memberOk(data.conversationId, user.userId))) {
        return callback?.({ error: 'Forbidden', code: 'FORBIDDEN' });
      }
      if (data.toUserId === user.userId) {
        return callback?.({ error: 'Invalid peer', code: 'INVALID_PEER' });
      }

      if (event === DM_EVENTS.CALL_HANGUP) {
        const hang = data as {
          conversationId: string;
          callType?: 'audio' | 'video';
          status?: 'completed' | 'missed' | 'rejected' | 'cancelled';
          durationSec?: number;
        };
        const convo = await Conversation.findById(hang.conversationId).select('workspaceId').lean();
        if (convo && hang.status) {
          const message = await messagesService.recordCall({
            conversationId: hang.conversationId,
            workspaceId: String(convo.workspaceId),
            senderId: user.userId,
            callType: hang.callType ?? 'audio',
            status: hang.status,
            durationSec: hang.durationSec,
          });
          io.to(dmRoom(hang.conversationId)).emit(DM_EVENTS.MESSAGE, message);
        }
      }

      io.to(userRoom(data.toUserId)).emit(event, {
        ...data,
        fromUserId: user.userId,
        fromName: user.name,
      });

      if (event === DM_EVENTS.CALL_INVITE) {
        io.to(userRoom(data.toUserId)).emit(DM_EVENTS.CALL_RINGING, {
          conversationId: data.conversationId,
          callId: data.callId,
          fromUserId: user.userId,
          fromName: user.name,
          callType: (data as { callType?: string }).callType,
        });
      }

      callback?.({ ok: true });
    } catch (err) {
      fail(callback, err);
    }
  };

  socket.on(DM_EVENTS.CALL_INVITE, (p, cb) => void forwardCall(DM_EVENTS.CALL_INVITE, DmCallInviteSchema, p, cb));
  socket.on(DM_EVENTS.CALL_ACCEPT, (p, cb) => void forwardCall(DM_EVENTS.CALL_ACCEPT, DmCallPeerSchema, p, cb));
  socket.on(DM_EVENTS.CALL_REJECT, (p, cb) => void forwardCall(DM_EVENTS.CALL_REJECT, DmCallPeerSchema, p, cb));
  socket.on(DM_EVENTS.CALL_SIGNAL, (p, cb) => void forwardCall(DM_EVENTS.CALL_SIGNAL, DmCallSignalSchema, p, cb));
  socket.on(DM_EVENTS.CALL_HANGUP, (p, cb) => void forwardCall(DM_EVENTS.CALL_HANGUP, DmCallHangupSchema, p, cb));

  socket.on('disconnect', () => {
    trackOffline(user.userId, socket.id);
    rateState.delete(socket.id);
    if (!isUserOnline(user.userId)) {
      io.emit(DM_EVENTS.PRESENCE, { userId: user.userId, online: false });
    }
  });
}
