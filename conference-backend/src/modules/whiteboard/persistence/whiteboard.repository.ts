import { WhiteboardDocument } from '../../../database/models/WhiteboardDocument.model';
import type { WhiteboardElement, WhiteboardFiles, WhiteboardSnapshot } from '../types/whiteboard.types';
import { logger } from '../../../infrastructure/logging/logger';

export type PersistedWhiteboard = {
  roomId: string;
  revision: number;
  elements: WhiteboardElement[];
  files: WhiteboardFiles;
};

/**
 * Persistence boundary for whiteboard scenes. Collaboration code should not
 * issue Mongo queries elsewhere.
 */
export function createWhiteboardRepository() {
  async function load(roomId: string): Promise<PersistedWhiteboard | null> {
    try {
      const doc = await WhiteboardDocument.findOne({ roomId }).lean();
      if (!doc) return null;
      return {
        roomId: doc.roomId,
        revision: doc.revision ?? 0,
        elements: (doc.elements ?? []) as WhiteboardElement[],
        files: (doc.files ?? {}) as WhiteboardFiles,
      };
    } catch (err) {
      logger.error('Whiteboard load failed', {
        roomId,
        err: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  async function save(snapshot: Omit<WhiteboardSnapshot, 'whiteboardId'> & { roomId: string }): Promise<void> {
    try {
      await WhiteboardDocument.findOneAndUpdate(
        { roomId: snapshot.roomId },
        {
          $set: {
            revision: snapshot.revision,
            elements: snapshot.elements,
            files: snapshot.files,
          },
        },
        { upsert: true, new: true },
      );
      logger.info('Whiteboard persisted', {
        roomId: snapshot.roomId,
        revision: snapshot.revision,
        elementCount: snapshot.elements.length,
      });
    } catch (err) {
      logger.error('Whiteboard save failed', {
        roomId: snapshot.roomId,
        err: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  async function remove(roomId: string): Promise<void> {
    try {
      await WhiteboardDocument.deleteOne({ roomId });
    } catch (err) {
      logger.error('Whiteboard delete failed', {
        roomId,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { load, save, remove };
}

export type WhiteboardRepository = ReturnType<typeof createWhiteboardRepository>;
