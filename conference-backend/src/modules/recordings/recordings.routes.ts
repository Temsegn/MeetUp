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
import { listMeetingParticipants } from '../meetings/services/meeting-participants.service';
import { resolveDurationSeconds } from './recordings.duration';

async function enrichParticipants(
  participants:
    | Array<{ userId?: string; name?: string; avatarUrl?: string | null }>
    | undefined,
) {
  const list = participants ?? [];
  if (list.length === 0) return [];
  const users = await Promise.all(
    list.map((p) => (p.userId ? authRepository.findUserById(p.userId) : Promise.resolve(null))),
  );
  return list.map((p, i) => {
    const u = users[i];
    return {
      userId: p.userId,
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
  let participants = await enrichParticipants(r.participants);
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
    status: rec.status,
    createdAt: rec.createdAt.toISOString(),
  });
});

// ── Stream / download recording ──────────────────────────────────────────────
router.get('/:id/stream', requireWorkspace('member'), async (req: AuthRequest, res) => {
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

  await Recording.findByIdAndUpdate(rec._id, { $inc: { views: 1 } });

  const range = req.headers.range;
  const { stat } = await import('fs').then((fs) => ({ stat: fs.promises.stat }));
  let fileSize: number;
  try {
    fileSize = (await stat(absPath)).size;
  } catch {
    throw new NotFoundError('Recording file');
  }

  const safeName = (rec.filename || `${rec.title || 'recording'}.mp4`).replace(/[^\w.\- ()]+/g, '_');
  res.setHeader('Content-Type', rec.mimeType || 'video/mp4');
  res.setHeader('Accept-Ranges', 'bytes');
  if (asDownload) {
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
  }

  if (range && !asDownload) {
    const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : fileSize - 1;
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
