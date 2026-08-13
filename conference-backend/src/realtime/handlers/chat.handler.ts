import { randomUUID } from 'crypto';
import { Server, Socket } from 'socket.io';
import { logger } from '../../infrastructure/logging/logger';
import { metrics } from '../../infrastructure/metrics/metrics.service';
import {
  validatePayload,
  SendMessageSchema,
  GetChatHistorySchema,
} from '../../shared/validation/socket.schemas';
import type { ChatMessagePayload } from '../../shared/types/socket.types';

const MAX_MESSAGES_PER_ROOM = 200;
const MAX_MESSAGES_PER_SECOND = 5;
const MESSAGE_RATE_WINDOW_MS = 1000;

/** In-memory bounded chat history. Cleared when room closes. */
const chatHistory = new Map<string, ChatMessagePayload[]>();

/** Per-socket rate limit state */
const rateLimitState = new Map<string, { count: number; windowStart: number }>();

type Callback = (res: unknown) => void;

function isRateLimited(socketId: string): boolean {
  const now = Date.now();
  const state = rateLimitState.get(socketId) ?? { count: 0, windowStart: now };

  if (now - state.windowStart > MESSAGE_RATE_WINDOW_MS) {
    // New window
    state.count = 1;
    state.windowStart = now;
    rateLimitState.set(socketId, state);
    return false;
  }

  state.count++;
  rateLimitState.set(socketId, state);
  return state.count > MAX_MESSAGES_PER_SECOND;
}

export const registerChatHandlers = (io: Server, socket: Socket) => {
  const user = socket.data.user as { userId: string; name: string };

  socket.on('send-message', (payload: unknown, callback?: Callback) => {
    const v = validatePayload(SendMessageSchema, payload);
    if (!v.success) {
      metrics.validationFailures.inc();
      return callback?.({ error: v.error, code: 'VALIDATION_ERROR' });
    }
    const { roomId, content } = v.data;

    // Room membership check
    const currentRoom = socket.data.currentRoom as { roomId: string } | undefined;
    if (!currentRoom || currentRoom.roomId !== roomId) {
      return callback?.({ error: 'Not in room', code: 'NOT_IN_ROOM' });
    }

    // Rate limiting
    if (isRateLimited(socket.id)) {
      return callback?.({ error: 'Too many messages — slow down', code: 'RATE_LIMITED' });
    }

    const message: ChatMessagePayload = {
      id:         randomUUID(),
      roomId,
      senderId:   user.userId,   // From JWT — never from client payload
      senderName: user.name,
      content,
      createdAt:  Date.now(),
    };

    // Bounded history
    const history = chatHistory.get(roomId) ?? [];
    history.push(message);
    if (history.length > MAX_MESSAGES_PER_ROOM) {
      history.splice(0, history.length - MAX_MESSAGES_PER_ROOM);
    }
    chatHistory.set(roomId, history);

    metrics.chatMessages.inc();

    // Broadcast to room (including sender)
    io.to(roomId).emit('chat-message', message);
    callback?.({ message });

    logger.debug('Chat message sent', { roomId, senderId: user.userId, msgId: message.id });
  });

  socket.on('get-chat-history', (payload: unknown, callback: Callback) => {
    const v = validatePayload(GetChatHistorySchema, payload);
    if (!v.success) return callback({ error: v.error });
    const { roomId } = v.data;

    const currentRoom = socket.data.currentRoom as { roomId: string } | undefined;
    if (!currentRoom || currentRoom.roomId !== roomId) {
      return callback({ error: 'Not in room', code: 'NOT_IN_ROOM' });
    }

    callback({ history: chatHistory.get(roomId) ?? [] });
  });
};

/** Called by RoomManager when a room is destroyed — prevents memory leak */
export function clearRoomChat(roomId: string): void {
  chatHistory.delete(roomId);
  logger.debug('Chat history cleared for closed room', { roomId });
}

/** Cleanup per-socket rate state on disconnect */
export function clearSocketRateLimit(socketId: string): void {
  rateLimitState.delete(socketId);
}
