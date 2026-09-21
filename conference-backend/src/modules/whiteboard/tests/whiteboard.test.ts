/**
 * Whiteboard unit tests — authz, scene merge, room lifecycle (no tldraw).
 */
import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach } from 'node:test';
import { createWhiteboardRoomService } from '../services/whiteboard-room.service';
import { getMeetingBinding } from '../services/whiteboard-authz.service';
import {
  mergeWhiteboardUpdate,
  shouldApplyRemote,
} from '../services/whiteboard-scene.service';
import type { WhiteboardElement } from '../types/whiteboard.types';
import type { WhiteboardRepository } from '../persistence/whiteboard.repository';

function el(
  id: string,
  version: number,
  versionNonce: number,
  extra: Partial<WhiteboardElement> = {},
): WhiteboardElement {
  return { id, version, versionNonce, type: 'rectangle', ...extra };
}

function memoryRepo(): WhiteboardRepository {
  const store = new Map<
    string,
    { roomId: string; revision: number; elements: WhiteboardElement[]; files: Record<string, never> }
  >();
  return {
    async load(roomId) {
      const doc = store.get(roomId);
      if (!doc) return null;
      return { ...doc, files: {} };
    },
    async save(snapshot) {
      store.set(snapshot.roomId, {
        roomId: snapshot.roomId,
        revision: snapshot.revision,
        elements: snapshot.elements,
        files: {},
      });
    },
    async remove(roomId) {
      store.delete(roomId);
    },
  };
}

describe('whiteboard authz', () => {
  it('rejects when socket is not in the requested room', () => {
    const socket = {
      data: { currentRoom: { roomId: 'room-a', participantId: 'p1' } },
    } as any;
    assert.equal(getMeetingBinding(socket, 'room-b'), null);
  });

  it('accepts matching room membership', () => {
    const socket = {
      data: { currentRoom: { roomId: 'room-a', participantId: 'p1' } },
    } as any;
    const binding = getMeetingBinding(socket, 'room-a');
    assert.ok(binding);
    assert.equal(binding!.participantId, 'p1');
  });
});

describe('whiteboard scene merge', () => {
  it('applies newer version', () => {
    assert.equal(shouldApplyRemote(el('a', 1, 1), el('a', 2, 1)), true);
    assert.equal(shouldApplyRemote(el('a', 2, 1), el('a', 1, 9)), false);
  });

  it('uses versionNonce as tiebreaker', () => {
    assert.equal(shouldApplyRemote(el('a', 1, 5), el('a', 1, 9)), true);
    assert.equal(shouldApplyRemote(el('a', 1, 9), el('a', 1, 5)), false);
  });

  it('merges partial updates without dropping unrelated elements', () => {
    const result = mergeWhiteboardUpdate({
      currentElements: [el('a', 1, 1), el('b', 1, 1)],
      currentFiles: {},
      incomingElements: [el('a', 2, 1, { isDeleted: false })],
    });
    assert.equal(result.applied.length, 1);
    assert.equal(result.elements.length, 2);
    assert.equal(result.elements.find((e) => e.id === 'a')!.version, 2);
    assert.equal(result.elements.find((e) => e.id === 'b')!.version, 1);
  });
});

describe('whiteboard room service', () => {
  let svc: ReturnType<typeof createWhiteboardRoomService>;

  beforeEach(() => {
    svc = createWhiteboardRoomService(memoryRepo());
  });

  afterEach(async () => {
    await svc.disposeRoom('meet-1');
  });

  it('creates a shared room and returns snapshot on join', async () => {
    const snap = await svc.attachSession({
      roomId: 'meet-1',
      socketId: 'sock-1',
      clientId: 'c1',
      participantId: 'p1',
      userName: 'Alice',
    });
    assert.equal(snap.whiteboardId, 'meet-1');
    assert.equal(snap.revision, 0);
    assert.equal(svc.hasRoom('meet-1'), true);
  });

  it('applies updates with server revision and merges for second peer', async () => {
    await svc.attachSession({
      roomId: 'meet-1',
      socketId: 'sock-1',
      clientId: 'c1',
      participantId: 'p1',
      userName: 'Alice',
    });
    await svc.attachSession({
      roomId: 'meet-1',
      socketId: 'sock-2',
      clientId: 'c2',
      participantId: 'p2',
      userName: 'Bob',
    });

    const r1 = svc.applyUpdate({
      roomId: 'meet-1',
      clientId: 'c1',
      elements: [el('shape-1', 1, 10)],
    });
    assert.ok(r1);
    assert.equal(r1!.revision, 1);
    assert.equal(r1!.applied.length, 1);

    const snap = svc.getSnapshot('meet-1');
    assert.equal(snap?.elements.length, 1);
    assert.equal(svc.getActiveSessionCount('meet-1'), 2);
  });

  it('rejects stale element versions', async () => {
    await svc.attachSession({
      roomId: 'meet-1',
      socketId: 'sock-1',
      clientId: 'c1',
      participantId: 'p1',
      userName: 'Alice',
    });
    svc.applyUpdate({
      roomId: 'meet-1',
      clientId: 'c1',
      elements: [el('shape-1', 5, 1)],
    });
    const stale = svc.applyUpdate({
      roomId: 'meet-1',
      clientId: 'c2',
      elements: [el('shape-1', 2, 99)],
    });
    assert.ok(stale);
    assert.equal(stale!.applied.length, 0);
    assert.equal(svc.getSnapshot('meet-1')?.elements[0].version, 5);
  });

  it('detaches and disposes when last session leaves', async () => {
    await svc.attachSession({
      roomId: 'meet-1',
      socketId: 'sock-1',
      clientId: 'c1',
      participantId: 'p1',
      userName: 'Alice',
    });
    await svc.detachSocket('meet-1', 'sock-1');
    assert.equal(svc.hasRoom('meet-1'), false);
  });

  it('clears scene by soft-deleting elements', async () => {
    await svc.attachSession({
      roomId: 'meet-1',
      socketId: 'sock-1',
      clientId: 'c1',
      participantId: 'p1',
      userName: 'Alice',
    });
    svc.applyUpdate({
      roomId: 'meet-1',
      clientId: 'c1',
      elements: [el('shape-1', 1, 1)],
    });
    const cleared = svc.clearScene('meet-1', 'c1');
    assert.ok(cleared);
    assert.equal(cleared!.revision, 2);
    assert.equal(svc.getSnapshot('meet-1')?.elements[0].isDeleted, true);
  });
});
