import type { Socket } from 'socket.io';

export type MeetingRoomBinding = {
  roomId: string;
  participantId: string;
};

/**
 * Returns the authenticated meeting binding for this socket, or null if the
 * peer is not currently in the requested room.
 */
export function getMeetingBinding(
  socket: Socket,
  roomId: string,
): MeetingRoomBinding | null {
  const current = socket.data.currentRoom as MeetingRoomBinding | undefined;
  if (!current || current.roomId !== roomId) return null;
  if (!current.participantId) return null;
  return current;
}
