/**
 * File storage port.
 *
 * MongoDB stores metadata only (Recording.storageKey, User.avatarKey, …).
 * Bytes live here, grouped by bucket:
 *   recordings/  meeting composite MP4s
 *   photos/      avatars and other images
 *   files/       chat attachments and other uploads
 *
 * Launch uses LocalStorage (disk). Swap the export in local.storage.ts
 * for S3 later — callers keep using StoragePort.
 */
export type StorageBucket = 'recordings' | 'photos' | 'files';

export interface StoragePort {
  /** Absolute directory for a bucket (needed by FFmpeg). */
  dir(bucket: StorageBucket): string;
  /** Absolute path for a key inside a bucket. */
  pathFor(bucket: StorageBucket, relativeKey: string): string;
  mkdir(bucket: StorageBucket, relativeKey: string): Promise<string>;
  put(bucket: StorageBucket, relativeKey: string, data: Buffer): Promise<string>;
  get(bucket: StorageBucket, relativeKey: string): Promise<Buffer>;
  delete(bucket: StorageBucket, relativeKey: string): Promise<void>;
}

export function toStorageKey(bucket: StorageBucket, relativeKey: string): string {
  return `${bucket}/${relativeKey.replace(/\\/g, '/')}`;
}
