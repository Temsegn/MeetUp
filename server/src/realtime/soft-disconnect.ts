import { Server, Socket } from 'socket.io';
import { logger } from '../infrastructure/logging/logger';

/** How long a peer may remain soft-disconnected before hard cleanup. */
export const SOFT_DISCONNECT_GRACE_MS = 45_000;

type PendingDisconnect = {
  roomId: string;
  participantId: string;
  userId: string;
  identityKey: string;
  name: string;
  socketId: string;
  joinedAt?: Date;
  workspaceId?: string | null;
  sessionId?: string | null;
  timer: ReturnType<typeof setTimeout>;
  onExpire: () => void;
};

const pendingByIdentity = new Map<string, PendingDisconnect>();

function key(roomId: string, identityKey: string): string {
  return `${roomId}::${identityKey}`;
}

export function scheduleSoftDisconnect(opts: {
  io: Server;
  roomId: string;
  participantId: string;
  userId: string;
  identityKey: string;
  name: string;
  socketId: string;
  joinedAt?: Date;
  workspaceId?: string | null;
  sessionId?: string | null;
  onExpire: () => void;
}): void {
  const k = key(opts.roomId, opts.identityKey);
  cancelSoftDisconnect(opts.roomId, opts.identityKey);

  const timer = setTimeout(() => {
    pendingByIdentity.delete(k);
    logger.info('Soft-disconnect grace expired — hard leave', {
      roomId: opts.roomId,
      participantId: opts.participantId,
      userId: opts.userId,
      identityKey: opts.identityKey,
    });
    opts.onExpire();
  }, SOFT_DISCONNECT_GRACE_MS);

  pendingByIdentity.set(k, {
    roomId: opts.roomId,
    participantId: opts.participantId,
    userId: opts.userId,
    identityKey: opts.identityKey,
    name: opts.name,
    socketId: opts.socketId,
    joinedAt: opts.joinedAt,
    workspaceId: opts.workspaceId,
    sessionId: opts.sessionId,
    timer,
    onExpire: opts.onExpire,
  });

  opts.io.to(opts.roomId).emit('peer-reconnecting', {
    participantId: opts.participantId,
    userId: opts.userId,
    name: opts.name,
    graceMs: SOFT_DISCONNECT_GRACE_MS,
  });

  logger.info('Soft-disconnect scheduled', {
    roomId: opts.roomId,
    participantId: opts.participantId,
    userId: opts.userId,
    identityKey: opts.identityKey,
    graceMs: SOFT_DISCONNECT_GRACE_MS,
  });
}

export function cancelSoftDisconnect(
  roomId: string,
  identityKey: string,
): PendingDisconnect | null {
  const k = key(roomId, identityKey);
  const pending = pendingByIdentity.get(k);
  if (!pending) return null;
  clearTimeout(pending.timer);
  pendingByIdentity.delete(k);
  return pending;
}

export function takeSoftDisconnect(
  roomId: string,
  identityKey: string,
): PendingDisconnect | null {
  return cancelSoftDisconnect(roomId, identityKey);
}

export function clearSoftDisconnectForSocket(socketId: string): void {
  for (const [k, pending] of pendingByIdentity) {
    if (pending.socketId === socketId) {
      clearTimeout(pending.timer);
      pendingByIdentity.delete(k);
    }
  }
}

/** Explicit leave — expire immediately without broadcasting reconnecting. */
export function forceExpireSoftDisconnect(roomId: string, identityKey: string): void {
  const pending = cancelSoftDisconnect(roomId, identityKey);
  if (pending) pending.onExpire();
}
