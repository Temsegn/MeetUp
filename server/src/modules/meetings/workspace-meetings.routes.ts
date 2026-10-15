import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { requireWorkspace } from '../workspace/workspace.middleware';
import { AuthRequest } from '../auth/auth.types';
import {
  listWorkspaceMeetings,
  getMeeting,
  getMeetingByRoomId,
  getMeetingStats,
  createWorkspaceMeeting,
  cancelMeeting,
  patchMeeting,
  joinMeeting,
  endMeetingById,
  registerForMeeting,
  addMeetingInvites,
  removeMeetingInvite,
  getPublicJoinStatus,
  retryMeetingInvitations,
  getMeetingCalendarIcs,
} from './services/meetings-workspace.service';
import {
  listUserNotifications,
  markNotificationsRead,
} from './services/meeting-participants.service';
import { isAppError } from '../../shared/errors/AppError';
import { isValidIanaTimezone } from './calendar/meeting-ics';

const router = Router();

const inviteRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  message: { error: 'Too many invitation requests. Please try again later.', code: 'RATE_LIMITED' },
});

const createMeetingRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  message: { error: 'Too many meeting create requests. Please try again later.', code: 'RATE_LIMITED' },
});

const CreateWorkspaceMeetingBody = z
  .object({
    roomId: z.string().trim().min(1).max(100).optional(),
    type: z.enum(['instant', 'scheduled']).optional(),
    title: z.string().trim().min(1).max(200),
    agenda: z.array(z.string().trim().max(500)).max(20).optional(),
    scheduledAt: z.string().optional(),
    duration: z.number().int().min(1).max(1440).optional(),
    timezone: z.string().trim().max(80).optional(),
    location: z.string().trim().max(500).optional(),
    description: z.string().trim().max(4000).optional(),
    settings: z
      .object({
        waitingRoom: z.boolean().optional(),
        autoRecord: z.boolean().optional(),
      })
      .optional(),
    participantIds: z.array(z.string().trim().min(1)).max(100).optional(),
    guestEmails: z.array(z.string().trim().email().max(320)).max(50).optional(),
  })
  .superRefine((data, ctx) => {
    if ((data.type ?? 'instant') === 'scheduled') {
      if (!data.scheduledAt || Number.isNaN(Date.parse(data.scheduledAt))) {
        ctx.addIssue({
          code: 'custom',
          path: ['scheduledAt'],
          message: 'scheduledAt must be a valid date for scheduled meetings.',
        });
      }
    }
    if (data.timezone && !isValidIanaTimezone(data.timezone)) {
      ctx.addIssue({
        code: 'custom',
        path: ['timezone'],
        message: 'timezone must be a valid IANA time zone.',
      });
    }
  });

// Public join gate for /join/:roomId (guests + invite links) — no auth.
// Optional ?email= returns previousDisplayName when that guest was already admitted.
router.get('/join-status/:roomId', async (req, res) => {
  try {
    const email =
      typeof req.query.email === 'string' ? req.query.email : null;
    const data = await getPublicJoinStatus(String(req.params['roomId'] ?? ''), {
      email,
    });
    res.json(data);
  } catch (err) {
    if (isAppError(err)) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code });
    }
    throw err;
  }
});

// workspace-scoped meetings under /workspace-meetings
// reuse requireWorkspace middleware for auth + role

router.get('/', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const q = req.query as Record<string, string>;
  const data = await listWorkspaceMeetings({
    workspaceId: req.workspaceId!,
    userId: req.user!.id,
    email: req.user!.email,
    role: req.workspaceRole,
    page: q.page ? parseInt(q.page) : 1,
    limit: q.limit ? parseInt(q.limit) : 20,
    status: q.status as 'scheduled' | 'upcoming' | 'live' | 'ended' | 'cancelled' | 'all' | undefined,
    q: q.q,
    date: q.date,
  });
  res.json(data);
});

router.get('/stats', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const stats = await getMeetingStats(req.workspaceId!, {
    userId: req.user!.id,
    email: req.user!.email,
    role: req.workspaceRole,
  });
  res.json(stats);
});

router.get('/notifications/mine', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const items = await listUserNotifications(req.user!.id);
  res.json({ notifications: items });
});

router.post('/notifications/read', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const body = req.body as { ids?: string[] };
  const result = await markNotificationsRead(req.user!.id, body.ids);
  res.json(result);
});

router.get('/by-room/:roomId', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const m = await getMeetingByRoomId(String(req.params['roomId'] ?? ''), {
    userId: req.user!.id,
    email: req.user!.email,
    role: req.workspaceRole,
  });
  res.json(m);
});

router.post('/', createMeetingRateLimiter, requireWorkspace('member'), async (req: AuthRequest, res) => {
  const parsed = CreateWorkspaceMeetingBody.safeParse(req.body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || 'Invalid meeting payload.';
    return res.status(400).json({ error: msg, code: 'VALIDATION_ERROR' });
  }
  const body = parsed.data;
  const { randomUUID } = await import('crypto');
  const roomId = body.roomId || randomUUID();
  const m = await createWorkspaceMeeting({
    workspaceId: req.workspaceId!,
    userId: req.user!.id,
    userName: req.user!.name,
    roomId,
    type: body.type,
    title: body.title,
    agenda: body.agenda,
    scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
    duration: body.duration,
    timezone: body.timezone,
    location: body.location,
    description: body.description,
    settings: body.settings,
    participantIds: body.participantIds,
    guestEmails: body.guestEmails,
  });
  res.status(201).json(m);
});

router.post('/:id/register', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const m = await registerForMeeting(
    String(req.params['id'] ?? ''),
    req.user!.id,
    req.workspaceId!,
    req.workspaceRole,
  );
  res.json(m);
});

router.post(
  '/:id/participants',
  inviteRateLimiter,
  requireWorkspace('member'),
  async (req: AuthRequest, res) => {
    const body = req.body as { userIds?: string[]; guestEmails?: string[] };
    const m = await addMeetingInvites(
      String(req.params['id'] ?? ''),
      { id: req.user!.id, role: req.workspaceRole!, name: req.user!.name },
      body,
    );
    res.json(m);
  },
);

router.post(
  '/:id/invitations/retry',
  inviteRateLimiter,
  requireWorkspace('member'),
  async (req: AuthRequest, res) => {
    const m = await retryMeetingInvitations(String(req.params['id'] ?? ''), {
      id: req.user!.id,
      role: req.workspaceRole!,
    });
    res.json(m);
  },
);

router.get('/:id/calendar.ics', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const ics = await getMeetingCalendarIcs(String(req.params['id'] ?? ''), {
    userId: req.user!.id,
    email: req.user!.email,
    role: req.workspaceRole,
  });
  res.setHeader('Content-Type', ics.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${ics.filename}"`);
  res.send(ics.content);
});

router.delete('/:id/participants/:userId', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const m = await removeMeetingInvite(
    String(req.params['id'] ?? ''),
    { id: req.user!.id, role: req.workspaceRole! },
    { userId: String(req.params['userId'] ?? '') },
  );
  res.json(m);
});

router.delete('/:id/guest-emails', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const body = req.body as { email?: string };
  const m = await removeMeetingInvite(
    String(req.params['id'] ?? ''),
    { id: req.user!.id, role: req.workspaceRole! },
    { guestEmail: body.email },
  );
  res.json(m);
});

router.get('/:id', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const m = await getMeeting(String(req.params['id'] ?? ''), {
    userId: req.user!.id,
    email: req.user!.email,
    role: req.workspaceRole,
  });
  res.json(m);
});

router.patch('/:id', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const body = req.body as {
    title?: string;
    agenda?: string[];
    scheduledAt?: string;
    duration?: number;
    timezone?: string;
    location?: string;
    description?: string;
    settings?: Record<string, boolean>;
  };
  if (body.timezone && !isValidIanaTimezone(body.timezone)) {
    return res.status(400).json({
      error: 'timezone must be a valid IANA time zone.',
      code: 'VALIDATION_ERROR',
    });
  }
  const m = await patchMeeting(
    String(req.params['id'] ?? ''),
    { id: req.user!.id, role: req.workspaceRole! },
    body,
  );
  res.json(m);
});

router.post('/:id/join', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const result = await joinMeeting(
    String(req.params['id'] ?? ''),
    req.user!.id,
    req.workspaceRole,
  );
  res.json(result);
});

router.post('/:id/end', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const m = await endMeetingById(
    String(req.params['id'] ?? ''),
    { id: req.user!.id, role: req.workspaceRole! },
  );
  res.json(m);
});

router.post('/:id/cancel', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const m = await cancelMeeting(
    String(req.params['id'] ?? ''),
    { id: req.user!.id, role: req.workspaceRole! },
  );
  res.json(m);
});

export const workspaceMeetingsRouter = router;
