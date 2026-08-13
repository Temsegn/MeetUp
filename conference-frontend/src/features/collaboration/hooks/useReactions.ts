import { useState, useEffect, useCallback } from 'react';
import { socketClient } from '../../../services/socket/socket-client';

export interface ReactionEvent {
  id: string;
  peerId: string;
  reaction: string;
  timestamp: number;
  offsetX: number;
}

export const useReactions = (roomId: string, peerId: string) => {
  const [activeReactions, setActiveReactions] = useState<ReactionEvent[]>([]);
  const [raisedHands, setRaisedHands] = useState<Set<string>>(new Set());

  useEffect(() => {
    const socket = socketClient.getSocket();
    if (!socket) return;

    // Backend sends { participantId, reaction } — NOT { peerId, reaction }
    const handleReaction = ({ participantId: senderId, reaction }: any) => {
      const reactionEvent: ReactionEvent = {
        id: Math.random().toString(36).substr(2, 9),
        peerId: senderId,
        reaction,
        timestamp: Date.now(),
        offsetX: 30 + Math.random() * 40
      };
      
      setActiveReactions(prev => [...prev, reactionEvent]);

      // Remove after animation (3 seconds)
      setTimeout(() => {
        setActiveReactions(prev => prev.filter(r => r.id !== reactionEvent.id));
      }, 3000);
    };

    // Backend sends { participantId, isRaised } — NOT { peerId, isRaised }
    const handleRaiseHand = ({ participantId: senderId, isRaised }: any) => {
      setRaisedHands(prev => {
        const next = new Set(prev);
        if (isRaised) next.add(senderId);
        else next.delete(senderId);
        return next;
      });
    };

    socket.on('peer-reaction', handleReaction);
    socket.on('peer-raise-hand', handleRaiseHand);

    return () => {
      socket.off('peer-reaction', handleReaction);
      socket.off('peer-raise-hand', handleRaiseHand);
    };
  }, [peerId]);

  const sendReaction = useCallback((reaction: string) => {
    const socket = socketClient.getSocket();
    
    // Optimistic UI for local reaction
    const reactionEvent: ReactionEvent = {
      id: Math.random().toString(36).substr(2, 9),
      peerId,
      reaction,
      timestamp: Date.now(),
      offsetX: 30 + Math.random() * 40
    };
    
    setActiveReactions(prev => [...prev, reactionEvent]);
    setTimeout(() => {
      setActiveReactions(prev => prev.filter(r => r.id !== reactionEvent.id));
    }, 3000);

    if (socket) {
      socket.emit('send-reaction', { roomId, peerId, reaction });
    }
  }, [roomId, peerId]);

  const toggleRaiseHand = useCallback(() => {
    const socket = socketClient.getSocket();
    setRaisedHands(prev => {
      const next = new Set(prev);
      const isRaised = !next.has(peerId);
      
      if (isRaised) next.add(peerId);
      else next.delete(peerId);
      
      if (socket) {
        socket.emit('raise-hand', { roomId, peerId, isRaised });
      }
      return next;
    });
  }, [roomId, peerId]);

  return { activeReactions, sendReaction, raisedHands, toggleRaiseHand };
};
