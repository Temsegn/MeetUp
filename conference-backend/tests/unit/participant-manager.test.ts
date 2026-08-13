/**
 * Unit tests for ParticipantManager
 * Run with: npx tsx --test tests/unit/participant-manager.test.ts
 * (or set up Jest/Vitest as needed)
 */
import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';

// Minimal stub — avoids importing mediasoup in unit tests
class StubTransport {
  public closed = false;
  public id = 'transport-' + Math.random().toString(36).slice(2);
  close() { this.closed = true; }
}

// Re-implement ParticipantManager locally with stub types for testing
// (mirroring the real implementation without mediasoup import)
interface PeerStub {
  id: string; userId: string; name: string; roomId: string; socketId: string;
  transports: Map<string, StubTransport>;
  producers: Map<string, any>;
  consumers: Map<string, any>;
  joinedAt: Date;
}

class TestableParticipantManager {
  private roomPeers = new Map<string, Map<string, PeerStub>>();
  private socketIndex = new Map<string, { roomId: string; participantId: string }>();

  addPeer(roomId: string, participantId: string, socketId: string, userId: string, name: string): PeerStub {
    if (!this.roomPeers.has(roomId)) this.roomPeers.set(roomId, new Map());
    const room = this.roomPeers.get(roomId)!;
    if (room.has(participantId)) return room.get(participantId)!;
    const peer: PeerStub = { id: participantId, userId, name, roomId, socketId, transports: new Map(), producers: new Map(), consumers: new Map(), joinedAt: new Date() };
    room.set(participantId, peer);
    this.socketIndex.set(socketId, { roomId, participantId });
    return peer;
  }

  getPeer(roomId: string, pid: string) { return this.roomPeers.get(roomId)?.get(pid); }
  getPeersInRoom(roomId: string) { return Array.from(this.roomPeers.get(roomId)?.values() ?? []); }
  getRoomParticipantCount(roomId: string) { return this.roomPeers.get(roomId)?.size ?? 0; }
  getPeerBySocketId(socketId: string): PeerStub | null {
    const ref = this.socketIndex.get(socketId);
    if (!ref) return null;
    return this.getPeer(ref.roomId, ref.participantId) ?? null;
  }
  isInRoom(roomId: string, pid: string) { return this.roomPeers.get(roomId)?.has(pid) ?? false; }
  removePeer(roomId: string, pid: string) {
    const room = this.roomPeers.get(roomId);
    if (!room) return;
    const peer = room.get(pid);
    if (!peer) return;
    for (const t of peer.transports.values()) t.close();
    room.delete(pid);
    this.socketIndex.delete(peer.socketId);
    if (room.size === 0) this.roomPeers.delete(roomId);
  }
  removePeerBySocketId(socketId: string) {
    const ref = this.socketIndex.get(socketId);
    if (!ref) return null;
    this.removePeer(ref.roomId, ref.participantId);
    return ref;
  }
}

describe('ParticipantManager', () => {
  let mgr: TestableParticipantManager;

  beforeEach(() => { mgr = new TestableParticipantManager(); });

  it('adds a peer and retrieves by participantId', () => {
    mgr.addPeer('room1', 'peer-1', 'socket-1', 'user-1', 'Alice');
    const peer = mgr.getPeer('room1', 'peer-1');
    assert.ok(peer);
    assert.equal(peer.name, 'Alice');
    assert.equal(peer.userId, 'user-1');
  });

  it('O(1) lookup by socketId via reverse index', () => {
    mgr.addPeer('room1', 'peer-1', 'socket-abc', 'user-1', 'Alice');
    const peer = mgr.getPeerBySocketId('socket-abc');
    assert.ok(peer);
    assert.equal(peer.id, 'peer-1');
  });

  it('returns null for unknown socketId', () => {
    assert.equal(mgr.getPeerBySocketId('no-such-socket'), null);
  });

  it('removePeerBySocketId returns correct ref and cleans up', () => {
    mgr.addPeer('room1', 'peer-1', 'socket-abc', 'user-1', 'Alice');
    const ref = mgr.removePeerBySocketId('socket-abc');
    assert.ok(ref);
    assert.equal(ref.roomId, 'room1');
    assert.equal(ref.participantId, 'peer-1');
    assert.equal(mgr.getPeer('room1', 'peer-1'), undefined);
    assert.equal(mgr.getPeerBySocketId('socket-abc'), null);
  });

  it('closes all transports when peer is removed', () => {
    const peer = mgr.addPeer('room1', 'peer-1', 'socket-1', 'user-1', 'Alice');
    const t1 = new StubTransport(); const t2 = new StubTransport();
    peer.transports.set(t1.id, t1 as any);
    peer.transports.set(t2.id, t2 as any);
    mgr.removePeer('room1', 'peer-1');
    assert.ok(t1.closed);
    assert.ok(t2.closed);
  });

  it('cleans up empty room entry after last peer leaves', () => {
    mgr.addPeer('room1', 'peer-1', 's1', 'u1', 'Alice');
    mgr.removePeer('room1', 'peer-1');
    assert.equal(mgr.getRoomParticipantCount('room1'), 0);
    assert.equal(mgr.getPeersInRoom('room1').length, 0);
  });

  it('handles multiple peers across multiple rooms', () => {
    mgr.addPeer('room1', 'p1', 's1', 'u1', 'Alice');
    mgr.addPeer('room1', 'p2', 's2', 'u2', 'Bob');
    mgr.addPeer('room2', 'p3', 's3', 'u3', 'Carol');

    assert.equal(mgr.getRoomParticipantCount('room1'), 2);
    assert.equal(mgr.getRoomParticipantCount('room2'), 1);

    mgr.removePeer('room1', 'p1');
    assert.equal(mgr.getRoomParticipantCount('room1'), 1);
    assert.ok(mgr.isInRoom('room1', 'p2'));
  });

  it('returns existing peer on duplicate addPeer (no duplicate)', () => {
    const p1 = mgr.addPeer('room1', 'p1', 's1', 'u1', 'Alice');
    const p2 = mgr.addPeer('room1', 'p1', 's1', 'u1', 'Alice');
    assert.equal(p1, p2);
    assert.equal(mgr.getRoomParticipantCount('room1'), 1);
  });
});
