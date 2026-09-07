import type { Server, Socket } from 'socket.io';

export type WaitingJoinRequest = {
  requestId: string;
  roomId: string;
  socketId: string;
  userId: string;
  name: string;
  avatarUrl?: string | null;
  avatarColor?: string | null;
  isGuest: boolean;
  requestedAt: number;
};

/** roomId → requestId → waiting request */
const waitingByRoom = new Map<string, Map<string, WaitingJoinRequest>>();

export function addWaitingRequest(req: WaitingJoinRequest): void {
  let room = waitingByRoom.get(req.roomId);
  if (!room) {
    room = new Map();
    waitingByRoom.set(req.roomId, room);
  }
  room.set(req.requestId, req);
}

export function removeWaitingRequest(roomId: string, requestId: string): WaitingJoinRequest | null {
  const room = waitingByRoom.get(roomId);
  if (!room) return null;
  const req = room.get(requestId) ?? null;
  if (req) room.delete(requestId);
  if (room.size === 0) waitingByRoom.delete(roomId);
  return req;
}

export function removeWaitingBySocket(socketId: string): WaitingJoinRequest | null {
  for (const [roomId, room] of waitingByRoom.entries()) {
    for (const [requestId, req] of room.entries()) {
      if (req.socketId === socketId) {
        room.delete(requestId);
        if (room.size === 0) waitingByRoom.delete(roomId);
        return req;
      }
    }
  }
  return null;
}

export function listWaiting(roomId: string): WaitingJoinRequest[] {
  const room = waitingByRoom.get(roomId);
  if (!room) return [];
  return Array.from(room.values()).sort((a, b) => a.requestedAt - b.requestedAt);
}

export function getWaiting(roomId: string, requestId: string): WaitingJoinRequest | null {
  return waitingByRoom.get(roomId)?.get(requestId) ?? null;
}

export function findHostSockets(io: Server, roomId: string, creatorId: string): Socket[] {
  if (!creatorId) return [];
  const hosts: Socket[] = [];
  for (const sock of io.sockets.sockets.values()) {
    const current = sock.data.currentRoom as { roomId: string } | undefined;
    const user = sock.data.user as { userId: string } | undefined;
    if (current?.roomId === roomId && user?.userId === creatorId) {
      hosts.push(sock);
    }
  }
  return hosts;
}
