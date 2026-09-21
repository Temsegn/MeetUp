import { useState, useEffect, useCallback } from 'react';
import { socketClient } from '../../../services/socket/socket-client';

/** Matches the ChatMessagePayload shape sent by the backend */
export interface ChatMessage {
  id: string;
  roomId?: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: number;
}

type Sender = { userId: string; userName: string };

export const useChat = (roomId: string, _peerId: string, sender?: Sender) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const socket = socketClient.getSocket();
    if (!socket) return;

    socket.emit('get-chat-history', { roomId }, (res: { history?: ChatMessage[] } | undefined) => {
      if (res?.history) setMessages(res.history);
    });

    const handleMessage = (message: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        const withoutOptimistic = prev.filter(
          (m) =>
            !(
              m.id.startsWith('local-') &&
              String(m.senderId) === String(message.senderId) &&
              m.content === message.content
            ),
        );
        return [...withoutOptimistic, message];
      });
    };

    socket.on('chat-message', handleMessage);
    return () => {
      socket.off('chat-message', handleMessage);
    };
  }, [roomId]);

  const sendMessage = useCallback(
    (text: string) => {
      const socket = socketClient.getSocket();
      if (!socket || !sender?.userId) return;

      const trimmed = text.trim();
      if (!trimmed) return;

      const optimistic: ChatMessage = {
        id: `local-${Date.now()}`,
        roomId,
        senderId: String(sender.userId),
        senderName: sender.userName,
        content: trimmed,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, optimistic]);
      socket.emit('send-message', { roomId, content: trimmed });
    },
    [roomId, sender?.userId, sender?.userName],
  );

  return { messages, sendMessage };
};
