import { promises as fs } from 'fs';
import { storage } from '../../infrastructure/storage/local.storage';
import { toStorageKey } from '../../infrastructure/storage/storage';

export interface RecordingFileDeps {
  mkdir(relativeDir: string): Promise<void>;
  putWebm(relativeKey: string, data: Buffer): Promise<void>;
  pathFor(relativeKey: string): string;
  delete(relativeKey: string): Promise<void>;
  size(absolutePath: string): Promise<number>;
  storageKey(relativeKey: string): string;
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
};
