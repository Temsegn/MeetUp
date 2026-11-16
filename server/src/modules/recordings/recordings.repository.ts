import { promises as fs } from 'fs';
import path from 'path';
import { storage } from '../../infrastructure/storage/local.storage';
import { toStorageKey } from '../../infrastructure/storage/storage';

export interface RecordingFileDeps {
  mkdir(relativeDir: string): Promise<void>;
  putWebm(relativeKey: string, data: Buffer): Promise<void>;
  pathFor(relativeKey: string): string;
  delete(relativeKey: string): Promise<void>;
  size(absolutePath: string): Promise<number>;
  storageKey(relativeKey: string): string;
  /** Move an already-written file (e.g. a streamed upload) to `relativeKey`. */
  adopt(absoluteSource: string, relativeKey: string): Promise<void>;
  /** Remove a file by absolute path (ignores missing files). */
  removeAbsolute(absolutePath: string): Promise<void>;
}

export const recordingFileRepository: RecordingFileDeps = {
  async mkdir(relativeDir) {
    await storage.mkdir('recordings', relativeDir);
  },
  async putWebm(relativeKey, data) {
    await storage.put('recordings', relativeKey, data);
  },
  pathFor(relativeKey) {
    return storage.pathFor('recordings', relativeKey);
  },
  async delete(relativeKey) {
    await storage.delete('recordings', relativeKey);
  },
  async size(absolutePath) {
    const st = await fs.stat(absolutePath);
    return st.size;
  },
  storageKey(relativeKey) {
    return toStorageKey('recordings', relativeKey);
  },
  async adopt(absoluteSource, relativeKey) {
    const dest = storage.pathFor('recordings', relativeKey);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    try {
      await fs.rename(absoluteSource, dest);
    } catch {
      // Different filesystem (e.g. tmp on another volume) → copy + delete.
      await fs.copyFile(absoluteSource, dest);
      await fs.unlink(absoluteSource).catch(() => {});
    }
  },
  async removeAbsolute(absolutePath) {
    await fs.unlink(absolutePath).catch(() => {});
  },
};
