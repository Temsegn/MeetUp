import { useEffect, useRef } from 'react';
import { connectDmSocket, DM_EVENTS, emitAck } from '../../../services/messages/dm-socket';
import type { ChatMessage } from '../../../services/messages/messages.service';
import { useChatStore } from '../store/chat.store';
import { getAccessToken } from '../../../services/auth/auth.service';

/**
 * Conversation-scoped DM listeners + join/leave.
 * Presence + receipt listeners live in useAppPresence (app-wide).
 * Marks messages read as soon as they are visible in the open chat.
 */
export function useDmRealtime(enabled: boolean, currentUserId?: string | null) {
  const upsertMessage = useChatStore((s) => s.upsertMessage);
  const applyRead = useChatStore((s) => s.applyRead);
  const setTyping = useChatStore((s) => s.setTyping);
  const clearUnread = useChatStore((s) => s.clearUnread);
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const joinedRef = useRef<string | null>(null);
  const markedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || !getAccessToken()) return;

    const socket = connectDmSocket();
    if (!socket) return;

    const markVisibleAsRead = (message: ChatMessage) => {
      if (!currentUserId || !message?.id || message.deletedAt) return;
      if (message.senderId === currentUserId) return;
      const active = useChatStore.getState().activeConversationId;
      if (message.conversationId !== active) return;
      if (message.readBy.includes(currentUserId)) return;
      if (markedRef.current.has(message.id)) return;
      markedRef.current.add(message.id);

      clearUnread(message.conversationId);
      // Optimistic local update for the viewer
      applyRead(message.conversationId, [message.id], currentUserId);
      void emitAck(DM_EVENTS.READ, {
        conversationId: message.conversationId,
        messageIds: [message.id],
      }).catch(() => {
        markedRef.current.delete(message.id);
      });
      void emitAck(DM_EVENTS.DELIVERED, {
        conversationId: message.conversationId,
        messageIds: [message.id],
      }).catch(() => {});
    };

    // Unread badges are bumped in useAppPresence — avoid double-count here.
    const onMessage = (message: ChatMessage) => {
      upsertMessage(message);
      markVisibleAsRead(message);
    };
    const onUpdate = (message: ChatMessage) => upsertMessage(message);
    const onTyping = (payload: {
      conversationId: string;
      userId: string;
      name: string;
      typing: boolean;
    }) => {
      if (payload.userId === currentUserId) return;
      setTyping(payload.conversationId, payload.userId, payload.name, payload.typing);
    };

    socket.on(DM_EVENTS.MESSAGE, onMessage);
    socket.on(DM_EVENTS.MESSAGE_UPDATE, onUpdate);
    socket.on(DM_EVENTS.TYPING, onTyping);

    return () => {
      socket.off(DM_EVENTS.MESSAGE, onMessage);
      socket.off(DM_EVENTS.MESSAGE_UPDATE, onUpdate);
      socket.off(DM_EVENTS.TYPING, onTyping);
    };
  }, [enabled, currentUserId, upsertMessage, applyRead, setTyping, clearUnread]);

  useEffect(() => {
    if (!enabled) return;
    const socket = connectDmSocket();
    if (!socket || !activeConversationId) return;

    const prev = joinedRef.current;
    if (prev && prev !== activeConversationId) {
      socket.emit(DM_EVENTS.LEAVE, { conversationId: prev });
    }
    joinedRef.current = activeConversationId;
    markedRef.current.clear();

    const list = useChatStore.getState().messagesByConv[activeConversationId];
    const since = list && list.length > 0 ? list[list.length - 1]?.createdAt : undefined;
    socket.emit(
      DM_EVENTS.JOIN,
      { conversationId: activeConversationId, since },
      (res: { messages?: ChatMessage[]; error?: string; code?: string }) => {
        if (res?.code === 'SELF_CHAT_NOT_ALLOWED' || res?.error?.includes('Self-chat')) {
          useChatStore.getState().setActiveConversation(null);
          return;
        }
        if (res?.messages?.length) {
          for (const m of res.messages) upsertMessage(m);
        }
      },
    );

    return () => {
      /* leave handled on id change / unmount below */
    };
  }, [enabled, activeConversationId, upsertMessage]);

  useEffect(() => {
    return () => {
      const id = joinedRef.current;
      const socket = connectDmSocket();
      if (id && socket) socket.emit(DM_EVENTS.LEAVE, { conversationId: id });
      joinedRef.current = null;
    };
  }, []);
}
