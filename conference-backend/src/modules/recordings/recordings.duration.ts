import { Types } from 'mongoose';
import { Recording } from '../../database/models/Recording.model';
import { storage } from '../../infrastructure/storage/local.storage';
import { probeDurationSeconds } from './transcode';

/** Use stored duration, or probe the MP4 and backfill DB when missing. */
export async function resolveDurationSeconds(rec: {
  _id: Types.ObjectId;
  durationSeconds?: number | null;
  storageKey?: string | null;
}): Promise<number> {
  if (rec.durationSeconds && rec.durationSeconds > 0) {
    return Math.floor(rec.durationSeconds);
  }
  if (!rec.storageKey) return 0;

  const relKey = rec.storageKey.replace(/^recordings\//, '');
  const absPath = storage.pathFor('recordings', relKey);
  const secs = await probeDurationSeconds(absPath);
  if (secs > 0) {
    await Recording.findByIdAndUpdate(rec._id, { durationSeconds: secs }).catch(() => {});
  }
  return secs;
}
