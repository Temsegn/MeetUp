import { Server, Socket } from 'socket.io';
import { buildAdmissionIdentityKey } from '../database/models/MeetingAdmission.model';
import { scheduleSoftDisconnect } from './soft-disconnect';
import { _cleanupPeer } from './handlers/media.handler';

type RoomMeta = {
  roomId: string;
  participantId: string;
  joinedAt?: Date;
  workspaceId?: string | null;
  sessionId?: string | null;
  identityKey?: string;
};

/**
 * Mark a peer as reconnecting for remotes and start the 20s hard-leave grace.
 * Safe to call from socket disconnect or an early client "connection lost" announce.
 */
export function beginSoftDisconnect(io: Server, socket: Socket): boolean {
  const user = socket.data.user as {
    userId: string;
    name: string;
    email?: string;
    isGuest?: boolean;
    guestEmail?: string;
  };
  const current = socket.data.currentRoom as RoomMeta | undefined;
  if (!current?.roomId || !current.participantId) return false;

  // Already soft-disconnected / left.
  if (socket.data.softDisconnect === true) return false;

  const identityKey =
    current.identityKey ||
    buildAdmissionIdentityKey({
      userId: user.userId,
      isGuest: Boolean(user.isGuest) || user.userId.startsWith('guest_'),
      email: user.guestEmail || user.email || null,
    });

  socket.data.softDisconnect = true;
  scheduleSoftDisconnect({
    io,
    roomId: current.roomId,
    participantId: current.participantId,
    userId: user.userId,
    identityKey,
    name: user.name,
    socketId: socket.id,
    joinedAt: current.joinedAt,
    workspaceId: current.workspaceId,
    sessionId: current.sessionId,
    onExpire: () => {
      try {
        socket.data.currentRoom = {
          roomId: current.roomId,
          participantId: current.participantId,
          joinedAt: current.joinedAt,
          workspaceId: current.workspaceId,
          sessionId: current.sessionId,
          identityKey,
        };
        _cleanupPeer(io, socket, current.roomId, current.participantId);
      } catch {
        /* best-effort */
      }
    },
  });
  return true;
}
