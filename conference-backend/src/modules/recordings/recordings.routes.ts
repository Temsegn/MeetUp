import { Router, Response } from 'express';
import express from 'express';
import { promises as fs } from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { authenticate, AuthRequest } from '../auth/auth.middleware';
import { env } from '../../config/env';
import { logger } from '../../infrastructure/logging/logger';
import { storage } from '../../infrastructure/storage/local.storage';
import { toStorageKey } from '../../infrastructure/storage/storage';

const execFileAsync = promisify(execFile);
const router = Router();

const ffmpegPath = env.RECORDING_FFMPEG_PATH || 'ffmpeg';

function sanitizeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
}

async function convertToMp4(inputWebm: string, outputMp4: string): Promise<void> {
  // Even dimensions required by libx264; genpts + CFR so the MP4 timeline/seek bar works.
  await execFileAsync(
    ffmpegPath,
    [
      '-hide_banner',
      '-loglevel', 'error',
      '-y',
      '-fflags', '+genpts',
      '-i', inputWebm,
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=30',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '48000',
      '-ac', '2',
      '-movflags', '+faststart',
      outputMp4,
    ],
    { maxBuffer: 20 * 1024 * 1024 },
  );
}

router.use(authenticate);

/**
 * POST /recordings/:roomId
 * Body: raw video/webm bytes (full meeting tab capture).
 * Converts to MP4 and auto-saves:
 *   storage/recordings/{roomId}/{recordingId}/meeting-composite.mp4
 */
router.post(
  '/:roomId',
  express.raw({
    type: () => true,
    limit: '500mb',
  }),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const roomId = sanitizeSegment(String(req.params.roomId || 'room'));
      const body = req.body;

      if (!Buffer.isBuffer(body) || body.length < 256) {
        res.status(400).json({ error: 'Empty or invalid recording body.' });
        return;
      }

      const recordingId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const relativeDir = `${roomId}/${recordingId}`;
      await storage.mkdir('recordings', relativeDir);

      const webmName = 'meeting-composite.webm';
      const mp4Name = 'meeting-composite.mp4';
      const webmKey = `${relativeDir}/${webmName}`;
      const mp4Key = `${relativeDir}/${mp4Name}`;
      const webmPath = storage.pathFor('recordings', webmKey);
      const mp4Path = storage.pathFor('recordings', mp4Key);

      await storage.put('recordings', webmKey, body);

      try {
        await convertToMp4(webmPath, mp4Path);
      } catch (convErr) {
        await storage.delete('recordings', webmKey);
        await storage.delete('recordings', mp4Key);
        logger.error('MP4 conversion failed', {
          err: convErr instanceof Error ? convErr.message : String(convErr),
          webmPath,
        });
        res.status(500).json({
          error: 'Failed to create MP4. Check RECORDING_FFMPEG_PATH / FFmpeg install.',
        });
        return;
      }

      // Keep only the single MP4 file
      await storage.delete('recordings', webmKey);

      const st = await fs.stat(mp4Path);
      const storageKey = toStorageKey('recordings', mp4Key);

      logger.info('Meeting composite recording saved as MP4', {
        roomId,
        recordingId,
        bytes: st.size,
        storageKey,
        userId: req.user?._id?.toString(),
      });

      res.status(201).json({
        success: true,
        format: 'mp4',
        roomId,
        recordingId,
        filename: mp4Name,
        bytes: st.size,
        storageKey,
        path: storageKey,
        relativePath: storageKey,
      });
    } catch (err) {
      logger.error('Failed to save meeting recording', {
        err: err instanceof Error ? err.message : String(err),
      });
      res.status(500).json({ error: 'Failed to save recording.' });
    }
  },
);

export const recordingsRouter = router;
