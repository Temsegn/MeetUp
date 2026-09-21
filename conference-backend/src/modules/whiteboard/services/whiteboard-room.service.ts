import { logger } from '../../../infrastructure/logging/logger';
import {
  WB_PERSIST_DEBOUNCE_MS,
} from '../whiteboard.constants';
import type {
  WhiteboardElement,
  WhiteboardFiles,
  WhiteboardSnapshot,
} from '../types/whiteboard.types';
import {
  createWhiteboardRepository,
  type WhiteboardRepository,
} from '../persistence/whiteboard.repository';
import {
  createEmptyScene,
  mergeWhiteboardUpdate,
} from './whiteboard-scene.service';

type RoomSession = {
  socketId: string;
  clientId: string;
  participantId: string;
  userName: string;
};

type RoomState = {
  roomId: string;
  revision: number;
  elements: WhiteboardElement[];
  files: WhiteboardFiles;
  sessionsBySocket: Map<string, RoomSession>;
  dirty: boolean;
  persistTimer: ReturnType<typeof setTimeout> | null;
  loading: Promise<void> | null;
};

/**
 * In-memory collaborative rooms keyed by meeting roomId.
 * Persistence is debounced via WhiteboardRepository.
 */
export function createWhiteboardRoomService(repo: WhiteboardRepository = createWhiteboardRepository()) {
  const rooms = new Map<string, RoomState>();

  function getEntry(roomId: string): RoomState | undefined {
    return rooms.get(roomId);
  }

  async function ensureLoaded(roomId: string): Promise<RoomState> {
    const existing = rooms.get(roomId);
    if (existing) {
      if (existing.loading) await existing.loading;
      return existing;
    }

    const state: RoomState = {
      roomId,
      ...createEmptyScene(),
      sessionsBySocket: new Map(),
      dirty: false,
      persistTimer: null,
      loading: null,
    };

    state.loading = (async () => {
      const persisted = await repo.load(roomId);
      if (persisted) {
        state.revision = persisted.revision;
        state.elements = persisted.elements;
        state.files = persisted.files;
      }
      logger.info('Whiteboard room created', {
        roomId,
        revision: state.revision,
        elementCount: state.elements.length,
      });
    })();

    rooms.set(roomId, state);
    await state.loading;
    state.loading = null;
    return state;
  }

  function schedulePersist(state: RoomState): void {
    state.dirty = true;
    if (state.persistTimer) return;
    state.persistTimer = setTimeout(() => {
      state.persistTimer = null;
      void flushPersist(state);
    }, WB_PERSIST_DEBOUNCE_MS);
  }

  async function flushPersist(state: RoomState): Promise<void> {
    if (!state.dirty) return;
    state.dirty = false;
    try {
      await repo.save({
        roomId: state.roomId,
        revision: state.revision,
        elements: state.elements,
        files: state.files,
      });
    } catch {
      state.dirty = true;
    }
  }

  async function attachSession(opts: {
    roomId: string;
    socketId: string;
    clientId: string;
    participantId: string;
    userName: string;
  }): Promise<WhiteboardSnapshot> {
    const state = await ensureLoaded(opts.roomId);
    state.sessionsBySocket.set(opts.socketId, {
      socketId: opts.socketId,
      clientId: opts.clientId,
      participantId: opts.participantId,
      userName: opts.userName,
    });
    return {
      whiteboardId: opts.roomId,
      revision: state.revision,
      elements: state.elements,
      files: state.files,
    };
  }

  function applyUpdate(opts: {
    roomId: string;
    clientId: string;
    elements: WhiteboardElement[];
    files?: WhiteboardFiles;
  }): { revision: number; applied: WhiteboardElement[]; files?: WhiteboardFiles } | null {
    const state = getEntry(opts.roomId);
    if (!state) return null;

    const merged = mergeWhiteboardUpdate({
      currentElements: state.elements,
      currentFiles: state.files,
      incomingElements: opts.elements,
      incomingFiles: opts.files,
    });

    if (merged.applied.length === 0 && !opts.files) {
      return { revision: state.revision, applied: [] };
    }

    state.elements = merged.elements;
    state.files = merged.files;
    state.revision += 1;
    schedulePersist(state);

    const filesOut =
      opts.files && Object.keys(opts.files).length > 0
        ? Object.fromEntries(
            Object.keys(opts.files)
              .filter((id) => merged.files[id])
              .map((id) => [id, merged.files[id]]),
          )
        : undefined;

    return {
      revision: state.revision,
      applied: merged.applied,
      files: filesOut && Object.keys(filesOut).length ? (filesOut as WhiteboardFiles) : undefined,
    };
  }

  function clearScene(roomId: string, clientId: string): { revision: number } | null {
    const state = getEntry(roomId);
    if (!state) return null;
    const cleared = state.elements.map((el) => ({
      ...el,
      isDeleted: true,
      version: (el.version ?? 0) + 1,
      versionNonce: Math.floor(Math.random() * 0x7fffffff),
      // stamp who cleared for debugging without trusting for auth
      updatedBy: clientId,
    }));
    state.elements = cleared;
    state.revision += 1;
    schedulePersist(state);
    return { revision: state.revision };
  }

  async function detachSocket(roomId: string, socketId: string): Promise<void> {
    const state = getEntry(roomId);
    if (!state) return;
    state.sessionsBySocket.delete(socketId);
    if (state.sessionsBySocket.size === 0) {
      if (state.persistTimer) {
        clearTimeout(state.persistTimer);
        state.persistTimer = null;
      }
      await flushPersist(state);
      rooms.delete(roomId);
      logger.info('Whiteboard room disposed (empty)', { roomId });
    }
  }

  function hasRoom(roomId: string): boolean {
    return rooms.has(roomId);
  }

  function getActiveSessionCount(roomId: string): number {
    return getEntry(roomId)?.sessionsBySocket.size ?? 0;
  }

  function getSnapshot(roomId: string): WhiteboardSnapshot | null {
    const state = getEntry(roomId);
    if (!state) return null;
    return {
      whiteboardId: roomId,
      revision: state.revision,
      elements: state.elements,
      files: state.files,
    };
  }

  async function disposeRoom(roomId: string): Promise<void> {
    const state = rooms.get(roomId);
    if (!state) return;
    if (state.persistTimer) {
      clearTimeout(state.persistTimer);
      state.persistTimer = null;
    }
    await flushPersist(state);
    rooms.delete(roomId);
  }

  async function flushAll(): Promise<void> {
    await Promise.all([...rooms.values()].map((s) => flushPersist(s)));
  }

  return {
    attachSession,
    applyUpdate,
    clearScene,
    detachSocket,
    hasRoom,
    getActiveSessionCount,
    getSnapshot,
    disposeRoom,
    flushAll,
  };
}

export type WhiteboardRoomService = ReturnType<typeof createWhiteboardRoomService>;
