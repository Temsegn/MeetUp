import { useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { connectDmSocket, disconnectDmSocket, DM_EVENTS } from '../../../services/messages/dm-socket';
import { getAccessToken } from '../../../services/auth/auth.service';
import { useChatStore } from '../store/chat.store';
import type { ChatMessage } from '../../../services/messages/messages.service';

/**
 * Keeps the authenticated DM socket alive for the whole app session so
 * presence is online on any screen while logged in (not only Messages).
 * Also bumps conversation unread badges when messages arrive off the Messages page,
 * and applies read/delivered receipts in realtime.
 */
export function useAppPresence() {
  const { user } = useAuth();
  const setPresence = useChatStore((s) => s.setPresence);
  const bumpUnread = useChatStore((s) => s.bumpUnread);
  const upsertMessage = useChatStore((s) => s.upsertMessage);
  const applyRead = useChatStore((s) => s.applyRead);
  const applyDelivered = useChatStore((s) => s.applyDelivered);

  useEffect(() => {
    if (!user?.id || !getAccessToken()) {
      disconnectDmSocket();
      return;
    }

    const socket = connectDmSocket();
    if (!socket) return;

    const onPresence = (payload: { userId: string; online: boolean }) => {
      setPresence(payload.userId, payload.online);
    };

    const onMessage = (message: ChatMessage) => {
      if (!message?.id || message.deletedAt) return;
      upsertMessage(message);
      const active = useChatStore.getState().activeConversationId;
      if (message.senderId !== user.id && message.conversationId !== active) {
        bumpUnread(message.conversationId);
      }
    };

    const onRead = (payload: {
      conversationId: string;
      messageIds: string[];
      readerId: string;
    }) => {
      if (!payload?.messageIds?.length) return;
      applyRead(payload.conversationId, payload.messageIds, payload.readerId);
    };

    const onDelivered = (payload: {
      conversationId: string;
      messageIds?: string[];
      userId?: string;
    }) => {
      if (payload.messageIds?.length && payload.userId) {
        applyDelivered(payload.conversationId, payload.messageIds, payload.userId);
      }
    };

    socket.on(DM_EVENTS.PRESENCE, onPresence);
    socket.on(DM_EVENTS.MESSAGE, onMessage);
    socket.on(DM_EVENTS.READ, onRead);
    socket.on(DM_EVENTS.DELIVERED, onDelivered);

    setPresence(user.id, true);

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && getAccessToken()) {
        connectDmSocket();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      socket.off(DM_EVENTS.PRESENCE, onPresence);
      socket.off(DM_EVENTS.MESSAGE, onMessage);
      socket.off(DM_EVENTS.READ, onRead);
      socket.off(DM_EVENTS.DELIVERED, onDelivered);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user?.id, setPresence, bumpUnread, upsertMessage, applyRead, applyDelivered]);

  useEffect(() => {
    if (user?.id) return;
    disconnectDmSocket();
  }, [user?.id]);
}
