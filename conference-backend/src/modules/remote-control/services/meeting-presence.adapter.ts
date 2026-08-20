import { mediaEngine } from '../../../media/media-engine';
import type { ControlPeerRef, MeetingPresencePort } from '../types/remote-control.types';

/** Adapter: remote-control uses meeting presence; it does not own the SFU. */
export const mediaPresenceAdapter: MeetingPresencePort = {
  getPeer(roomId, participantId): ControlPeerRef | null {
    const peer = mediaEngine.getPeer(roomId, participantId);
    if (!peer) return null;
    return {
      participantId: peer.id,
      userId: peer.userId,
      name: peer.name,
      socketId: peer.socketId,
    };
  },
  isInRoom(roomId, participantId) {
    return Boolean(mediaEngine.getPeer(roomId, participantId));
  },
};
