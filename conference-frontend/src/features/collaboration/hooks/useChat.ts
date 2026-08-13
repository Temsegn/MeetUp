import { useState, useEffect, useCallback } from 'react';
import { socketClient } from '../../../services/socket/socket-client';

/** Matches the ChatMessagePayload shape sent by the backend */
export interface ChatMessage {
  id: string;
  roomId?: string;
  senderId: string;    // server-assigned userId (was peerId)
  senderName: string;  // display name from JWT
  content: string;     // message body (was text)
  createdAt: number;   // epoch ms (was timestamp)
}

export const useChat = (roomId: string, _peerId: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const socket = socketClient.getSocket();
    if (!socket) return;

    // Fetch history on join
    socket.emit('get-chat-history', { roomId }, (res: any) => {
      if (res?.history) {
        setMessages(res.history);
      }
    });

    const handleMessage = (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
    };

    socket.on('chat-message', handleMessage);

    return () => {
      socket.off('chat-message', handleMessage);
    };
  }, [roomId]);

  const sendMessage = useCallback((text: string) => {
    const socket = socketClient.getSocket();
    if (!socket) return;
    // Backend expects { roomId, content } — the server derives senderId from JWT
    socket.emit('send-message', { roomId, content: text });
  }, [roomId]);

  return { messages, sendMessage };
};
