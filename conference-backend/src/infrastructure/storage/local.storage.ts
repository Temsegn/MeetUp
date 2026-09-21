import { promises as fs } from 'fs';
import path from 'path';
import { env } from '../../config/env';
import type { StorageBucket, StoragePort } from './storage';
import { toStorageKey } from './storage';

const BUCKETS: StorageBucket[] = ['recordings', 'photos', 'files'];

function sanitizeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
}

export class LocalStorage implements StoragePort {
  private readonly root: string;

  constructor(root = path.resolve(env.STORAGE_DIR || path.join(process.cwd(), 'storage'))) {
    this.root = root;
  }

  dir(bucket: StorageBucket): string {
    if (bucket === 'recordings' && env.RECORDINGS_DIR) {
      return path.resolve(env.RECORDINGS_DIR);
    }
    return path.join(this.root, bucket);
  }

  pathFor(bucket: StorageBucket, relativeKey: string): string {
    const parts = relativeKey
      .split(/[/\\]/)
      .map(sanitizeSegment)
      .filter((part) => part && part !== '.' && part !== '..');
    const abs = path.resolve(this.dir(bucket), ...parts);
    const base = path.resolve(this.dir(bucket));
    if (!abs.startsWith(base + path.sep) && abs !== base) {
      throw new Error('Invalid storage key');
    }
    return abs;
  }

  async mkdir(bucket: StorageBucket, relativeKey: string): Promise<string> {
    const dir = this.pathFor(bucket, relativeKey);
    await fs.mkdir(dir, { recursive: true });
    return dir;
  }

  async put(bucket: StorageBucket, relativeKey: string, data: Buffer): Promise<string> {
    const abs = this.pathFor(bucket, relativeKey);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, data);
    return toStorageKey(bucket, relativeKey);
  }

  async get(bucket: StorageBucket, relativeKey: string): Promise<Buffer> {
    return fs.readFile(this.pathFor(bucket, relativeKey));
  }

  async delete(bucket: StorageBucket, relativeKey: string): Promise<void> {
    await fs.unlink(this.pathFor(bucket, relativeKey)).catch(() => {});
  }

  async ensureBuckets(): Promise<void> {
    await fs.mkdir(this.root, { recursive: true });
    await Promise.all(BUCKETS.map((bucket) => fs.mkdir(this.dir(bucket), { recursive: true })));
  }
}

export const storage = new LocalStorage();
