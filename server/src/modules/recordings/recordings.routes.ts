import { Router } from 'express';
import { createReadStream } from 'fs';
import { Types } from 'mongoose';
import express from 'express';
import { requireWorkspace } from '../workspace/workspace.middleware';
import { authenticate } from '../auth/middleware/authenticate.middleware';
import { AuthRequest } from '../auth/auth.types';
import { Recording } from '../../database/models/Recording.model';
import { storage } from '../../infrastructure/storage/local.storage';
import { NotFoundError, ForbiddenError } from '../../shared/errors/AppError';
import { hasMinRole } from '../workspace/workspace.types';
import { createRecordingsController } from './controllers/recordings.controller';
import { RoomIdParamsSchema, validateParams } from './recordings.validation';
import { authRepository } from '../auth/auth.repository';
import { tokenService } from '../auth/services/token.service';
import { listMeetingParticipants } from '../meetings/services/meeting-participants.service';
import { resolveDurationSeconds } from './recordings.duration';

async function enrichParticipants(
  participants:
    | Array<{ userId?: string; name?: string; avatarUrl?: string | null }>
    | undefined,
) {
  const list = participants ?? [];
  if (list.length === 0) return [];
  // Bug 3 fix: only call findUserById for entries that actually have a userId.
  // Guest/anonymous participants have no userId — we must preserve their stored
  // name directly instead of letting the lookup return null and losing them.
  const users = await Promise.all(
    list.map((p) =>
      p.userId ? authRepository.findUserById(p.userId) : Promise.resolve(null),
    ),
  );
  return list.map((p, i) => {
    const u = users[i];
    return {
      userId: p.userId,
      // Prefer the DB user record; fall back to the stored name from the
      // recording document; final fallback is a generic label.
      name: u?.name ?? p.name ?? 'Participant',
      avatarUrl: u?.avatarUrl ?? p.avatarUrl ?? null,
      avatarColor: u?.avatarColor ?? null,
    };
  });
}

/** Prefer stored participants; fall back to meeting roster / uploader. */
async function resolveRecordingParticipants(r: {
  participants?: Array<{ userId?: string; name?: string; avatarUrl?: string | null }>;
  meetingId?: Types.ObjectId | null;
  sharedBy?: Types.ObjectId | null;
}) {
  // Bug 3 fix: enrichParticipants now preserves guest entries (no userId),
  // so the only time we need to fall back is when the stored array is truly
  // empty (recording was saved before the participant snapshot was added).
  let participants = await enrichParticipants(r.participants);

  // Only query the live roster when we have nothing stored at all.
  if (participants.length === 0 && r.meetingId) {
    const roster = await listMeetingParticipants(String(r.meetingId));
    participants = roster.map((p) => ({
      userId: p.userId,
      name: p.name,
      avatarUrl: p.avatarUrl ?? null,
      avatarColor: p.avatarColor ?? null,
    }));
  }
  if (participants.length === 0 && r.sharedBy) {
    const u = await authRepository.findUserById(String(r.sharedBy));
    if (u) {
      participants = [
        {
          userId: String(u.id),
          name: u.name,
          avatarUrl: u.avatarUrl ?? null,
          avatarColor: u.avatarColor ?? null,
        },
      ];
    }
  }
  return participants;
}

async function resolveSharedBy(sharedBy?: Types.ObjectId | null) {
  if (!sharedBy) return null;
  const u = await authRepository.findUserById(String(sharedBy));
  if (!u) {
    return {
      userId: String(sharedBy),
      name: 'Unknown',
      avatarUrl: null as string | null,
      avatarColor: null as string | null,
    };
  }
  return {
    userId: String(u.id),
    name: u.name,
    avatarUrl: u.avatarUrl ?? null,
    avatarColor: u.avatarColor ?? null,
  };
}

const router = Router();
const legacyController = createRecordingsController();

// ── List recordings (workspace-scoped) ──────────────────────────────────────
router.get('/', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const q = req.query as Record<string, string>;
  const page = parseInt(q.page ?? '1');
  const limit = Math.min(parseInt(q.limit ?? '20'), 100);
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = { workspaceId: new Types.ObjectId(req.workspaceId!) };
  if (q.meetingId) filter.meetingId = new Types.ObjectId(q.meetingId);

  const [rows, total] = await Promise.all([
    Recording.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Recording.countDocuments(filter),
  ]);

  const recordings = await Promise.all(
    rows.map(async (r) => ({
      id: String(r._id),
      recordingId: r.recordingId,
      roomId: r.roomId,
      title: r.title,
      description: r.description,
      durationSeconds: await resolveDurationSeconds(r),
      bytes: r.bytes,
      views: r.views,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      participants: await resolveRecordingParticipants(r),
      sharedBy: await resolveSharedBy(r.sharedBy),
    })),
  );

  res.json({
    recordings,
    total,
    page,
    limit,
  });
});

function pctChange(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// ── Recording stats (workspace-scoped) ───────────────────────────────────────
router.get('/stats', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const workspaceId = new Types.ObjectId(req.workspaceId!);
  const now = new Date();
  const currentFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const previousFrom = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const [allAgg, currentAgg, previousAgg] = await Promise.all([
    Recording.aggregate([
      { $match: { workspaceId, status: { $ne: 'failed' } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          durationSeconds: { $sum: '$durationSeconds' },
          storageBytes: { $sum: '$bytes' },
          views: { $sum: '$views' },
        },
      },
    ]),
    Recording.aggregate([
      { $match: { workspaceId, status: { $ne: 'failed' }, createdAt: { $gte: currentFrom } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          durationSeconds: { $sum: '$durationSeconds' },
          storageBytes: { $sum: '$bytes' },
          views: { $sum: '$views' },
        },
      },
    ]),
    Recording.aggregate([
      {
        $match: {
          workspaceId,
          status: { $ne: 'failed' },
          createdAt: { $gte: previousFrom, $lt: currentFrom },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          durationSeconds: { $sum: '$durationSeconds' },
          storageBytes: { $sum: '$bytes' },
          views: { $sum: '$views' },
        },
      },
    ]),
  ]);

  const all = allAgg[0] ?? { total: 0, durationSeconds: 0, storageBytes: 0, views: 0 };
  const cur = currentAgg[0] ?? { total: 0, durationSeconds: 0, storageBytes: 0, views: 0 };
  const prev = previousAgg[0] ?? { total: 0, durationSeconds: 0, storageBytes: 0, views: 0 };

  res.json({
    total: all.total as number,
    totalDurationSeconds: all.durationSeconds as number,
    storageBytes: all.storageBytes as number,
    filesShared: all.views as number,
    trends: {
      total: pctChange(cur.total as number, prev.total as number),
      duration: pctChange(cur.durationSeconds as number, prev.durationSeconds as number),
      storage: pctChange(cur.storageBytes as number, prev.storageBytes as number),
      filesShared: pctChange(cur.views as number, prev.views as number),
    },
  });
});

// ── Get single recording ─────────────────────────────────────────────────────
router.get('/:id', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const rec = await Recording.findById(String(req.params['id'] ?? '')).lean();
  if (!rec) throw new NotFoundError('Recording');
  if (String(rec.workspaceId) !== req.workspaceId) throw new ForbiddenError();
  res.json({
    id: String(rec._id),
    recordingId: rec.recordingId,
    roomId: rec.roomId,
    title: rec.title,
    description: rec.description,
    storageKey: rec.storageKey,
    durationSeconds: await resolveDurationSeconds(rec),
    bytes: rec.bytes,
    views: rec.views,
    participants: await resolveRecordingParticipants(rec),
    sharedBy: await resolveSharedBy(rec.sharedBy),
    status: rec.status,
    createdAt: rec.createdAt.toISOString(),
  });
});

// ── Stream / download recording ──────────────────────────────────────────────
//
// Bug 2 fix: also accept a short-lived access token in the `?token=` query
// param so the browser's <video src="..."> element can stream without needing
// a custom Authorization header. The existing Bearer-header path is unchanged.
//
// Middleware order:
//   1. If ?token= is present, verify it and inject req.user before the normal
//      requireWorkspace check runs.
//   2. If no token query param, requireWorkspace will rely on the Authorization
//      header set by the authenticate middleware applied earlier in the chain.
async function injectTokenQueryAuth(
  req: AuthRequest,
  res: import('express').Response,
  next: import('express').NextFunction,
): Promise<void> {
  const queryToken = String(req.query.token ?? '').trim();
  const wsid = String(req.query.wsid ?? '').trim();

  if (!queryToken) {
    next();
    return;
  }

  try {
    const payload = tokenService.verifyAccessToken(queryToken);
    const user = await authRepository.findUserById(payload.userId);
    if (!user) {
      res.status(401).json({ error: 'Account not found.', code: 'USER_NOT_FOUND' });
      return;
    }
    req.user = user;
    // Inject the workspace id so requireWorkspace can resolve it
    if (wsid) {
      req.headers['x-workspace-id'] = wsid;
    }
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.', code: 'INVALID_TOKEN' });
  }
}

router.get('/:id/stream', injectTokenQueryAuth, requireWorkspace('member'), async (req: AuthRequest, res) => {
  const rec = await Recording.findById(String(req.params['id'] ?? '')).lean();
  if (!rec) throw new NotFoundError('Recording');
  if (String(rec.workspaceId) !== req.workspaceId) throw new ForbiddenError();

  const relKey = rec.storageKey.replace(/^recordings\//, '');
  const absPath = storage.pathFor('recordings', relKey);
  const asDownload =
    String(req.query.download ?? '') === '1' || String(req.query.download ?? '') === 'true';

  // Backfill duration from the file when missing (legacy rows).
  if (!rec.durationSeconds || rec.durationSeconds <= 0) {
    void resolveDurationSeconds(rec);
  }

  const { stat: fsStat } = await import('fs').then((fs) => ({ stat: fs.promises.stat }));
  let fileStat: import('fs').Stats;
  try {
    fileStat = await fsStat(absPath);
  } catch {
    throw new NotFoundError('Recording file');
  }
  const fileSize = fileStat.size;
  const lastModified = fileStat.mtime.toUTCString();
  // ETag: hex of mtime + size — cheap, stable, and unique per file version
  const etag = `"${fileStat.mtimeMs.toString(16)}-${fileSize.toString(16)}"`;

  // ── HTTP caching headers ──────────────────────────────────────────────────
  // Cache for 1 hour in any shared proxy / CDN. Immutable recordings don't
  // change after upload so 1h is conservative; raise to 86400 for production.
  // We always set Vary: Range so caches store range responses separately.
  res.setHeader('Cache-Control', asDownload ? 'no-store' : 'public, max-age=3600');
  res.setHeader('ETag', etag);
  res.setHeader('Last-Modified', lastModified);
  res.setHeader('Vary', 'Range');
  // X-Content-Duration lets players display duration before loading the file
  if (rec.durationSeconds && rec.durationSeconds > 0) {
    res.setHeader('X-Content-Duration', String(rec.durationSeconds));
  }

  // ── 304 Not Modified ─────────────────────────────────────────────────────
  // Only honour conditional requests for non-download (streaming) requests.
  if (!asDownload) {
    const ifNoneMatch = req.headers['if-none-match'];
    const ifModifiedSince = req.headers['if-modified-since'];
    const etagMatch = ifNoneMatch && (ifNoneMatch === etag || ifNoneMatch === '*');
    const freshSince =
      ifModifiedSince && new Date(ifModifiedSince) >= fileStat.mtime;
    if (etagMatch || freshSince) {
      res.status(304).end();
      return;
    }
  }

  // Only increment views on first load (no Range header = full load or first chunk).
  if (!req.headers.range || asDownload) {
    await Recording.findByIdAndUpdate(rec._id, { $inc: { views: 1 } });
  }

  const range = req.headers.range;
  const safeName = (rec.filename || `${rec.title || 'recording'}.mp4`).replace(/[^\w.\- ()]+/g, '_');
  res.setHeader('Content-Type', rec.mimeType || 'video/mp4');
  res.setHeader('Accept-Ranges', 'bytes');
  if (asDownload) {
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
  }

  if (range && !asDownload) {
    // ── HTTP 206 Partial Content ────────────────────────────────────────────
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    // Default end: serve up to 2 MB per chunk so the browser buffers quickly
    // without downloading the whole file on the first request.
    const defaultChunk = 2 * 1024 * 1024; // 2 MB
    const end = parts[1]
      ? parseInt(parts[1], 10)
      : Math.min(start + defaultChunk - 1, fileSize - 1);
    const chunkSize = end - start + 1;
    res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
    res.setHeader('Content-Length', chunkSize);
    res.status(206);
    createReadStream(absPath, { start, end }).pipe(res);
  } else {
    res.setHeader('Content-Length', fileSize);
    createReadStream(absPath).pipe(res);
  }
});

// ── Poster / thumbnail image ─────────────────────────────────────────────────
// GET /:id/poster  — serves a pre-generated JPEG thumbnail (first frame).
// The poster is stored alongside the MP4 as poster.jpg in the same directory.
// If the file doesn't exist yet (legacy recording or extraction still pending)
// we return 204 No Content so the player gracefully falls back to a black frame.
router.get('/:id/poster', injectTokenQueryAuth, requireWorkspace('member'), async (req: AuthRequest, res) => {
  const rec = await Recording.findById(String(req.params['id'] ?? '')).lean();
  if (!rec) throw new NotFoundError('Recording');
  if (String(rec.workspaceId) !== req.workspaceId) throw new ForbiddenError();

  // Derive poster path: same directory as the MP4, file named poster.jpg
  const relKey = rec.storageKey.replace(/^recordings\//, '');
  const dirKey = relKey.substring(0, relKey.lastIndexOf('/'));
  const posterRelKey = `${dirKey}/poster.jpg`;

  let posterPath: string;
  try {
    posterPath = storage.pathFor('recordings', posterRelKey);
  } catch {
    res.status(204).end();
    return;
  }

  const { stat: fsStat, readFile } = await import('fs').then((fs) => ({
    stat: fs.promises.stat,
    readFile: fs.promises.readFile,
  }));

  let posterStat: import('fs').Stats;
  try {
    posterStat = await fsStat(posterPath);
  } catch {
    // Poster not yet generated — try on-demand extraction
    const { extractPosterFrame } = await import('./transcode');
    const mp4Path = storage.pathFor('recordings', relKey);
    const ok = await extractPosterFrame(mp4Path, posterPath);
    if (!ok) {
      res.status(204).end();
      return;
    }
    posterStat = await fsStat(posterPath);
  }

  const etag = `"poster-${posterStat.mtimeMs.toString(16)}"`;
  const ifNoneMatch = req.headers['if-none-match'];
  if (ifNoneMatch === etag) {
    res.status(304).end();
    return;
  }

  const data = await readFile(posterPath);
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Content-Length', data.length);
  res.setHeader('Cache-Control', 'public, max-age=86400'); // poster is immutable
  res.setHeader('ETag', etag);
  res.end(data);
});

// ── Update recording (rename) ────────────────────────────────────────────────
router.patch('/:id', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const rec = await Recording.findById(String(req.params['id'] ?? '')).lean();
  if (!rec) throw new NotFoundError('Recording');
  if (String(rec.workspaceId) !== req.workspaceId) throw new ForbiddenError();

  const isOwner = rec.sharedBy && String(rec.sharedBy) === req.user!.id;
  const isAdminPlus = hasMinRole(req.workspaceRole!, 'admin');
  if (rec.sharedBy && !isOwner && !isAdminPlus) {
    throw new ForbiddenError('Only the uploader or an admin can rename this recording.');
  }

  const title = String((req.body as { title?: string }).title ?? '').trim();
  if (!title) {
    res.status(400).json({ error: 'Title is required' });
    return;
  }
  if (title.length > 200) {
    res.status(400).json({ error: 'Title must be 200 characters or fewer' });
    return;
  }

  const updated = await Recording.findByIdAndUpdate(
    rec._id,
    { title },
    { new: true },
  ).lean();
  if (!updated) throw new NotFoundError('Recording');

  res.json({
    id: String(updated._id),
    recordingId: updated.recordingId,
    roomId: updated.roomId,
    title: updated.title,
    description: updated.description,
    durationSeconds: updated.durationSeconds,
    bytes: updated.bytes,
    views: updated.views,
    status: updated.status,
    createdAt: updated.createdAt.toISOString(),
    participants: await resolveRecordingParticipants(updated),
  });
});

// ── Delete recording ─────────────────────────────────────────────────────────
router.delete('/:id', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const rec = await Recording.findById(String(req.params['id'] ?? '')).lean();
  if (!rec) throw new NotFoundError('Recording');
  if (String(rec.workspaceId) !== req.workspaceId) throw new ForbiddenError();

  // Any active workspace member may delete; prefer uploader / admin when available
  const isOwner = rec.sharedBy && String(rec.sharedBy) === req.user!.id;
  const isAdminPlus = hasMinRole(req.workspaceRole!, 'admin');
  if (rec.sharedBy && !isOwner && !isAdminPlus) {
    throw new ForbiddenError('Only the uploader or an admin can delete this recording.');
  }

  const relKey = rec.storageKey.replace(/^recordings\//, '');
  await storage.delete('recordings', relKey).catch(() => {});
  await Recording.findByIdAndDelete(rec._id);
  res.json({ success: true });
});

// ── Legacy upload endpoint (raw webm → MP4) ─────────────────────────────────
router.post(
  '/:roomId',
  authenticate,
  express.raw({ type: () => true, limit: '500mb' }),
  validateParams(RoomIdParamsSchema),
  (req, res) => legacyController.upload(req, res),
);

export { router as recordingsRouter };
