import { Router } from 'express';
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
} from './services/meetings-workspace.service';
import {
  listUserNotifications,
  markNotificationsRead,
} from './services/meeting-participants.service';

const router = Router();

// workspace-scoped meetings under /workspace-meetings
// reuse requireWorkspace middleware for auth + role

router.get('/', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const q = req.query as Record<string, string>;
  const data = await listWorkspaceMeetings({
    workspaceId: req.workspaceId!,
    page: q.page ? parseInt(q.page) : 1,
    limit: q.limit ? parseInt(q.limit) : 20,
    status: q.status as 'scheduled' | 'upcoming' | 'live' | 'ended' | 'cancelled' | 'all' | undefined,
    q: q.q,
    date: q.date,
  });
  res.json(data);
});

router.get('/stats', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const stats = await getMeetingStats(req.workspaceId!);
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
  const m = await getMeetingByRoomId(String(req.params['roomId'] ?? ''));
  res.json(m);
});

router.post('/', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const body = req.body as {
    roomId?: string;
    type?: 'instant' | 'scheduled';
    title?: string;
    agenda?: string[];
    scheduledAt?: string;
    duration?: number;
    settings?: { waitingRoom?: boolean; autoRecord?: boolean };
    participantIds?: string[];
    guestEmails?: string[];
  };
  if (!body.title?.trim()) {
    return res.status(400).json({ error: 'Meeting title is required.', code: 'VALIDATION_ERROR' });
  }
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
  );
  res.json(m);
});

router.post('/:id/participants', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const body = req.body as { userIds?: string[]; guestEmails?: string[] };
  const m = await addMeetingInvites(
    String(req.params['id'] ?? ''),
    { id: req.user!.id, role: req.workspaceRole!, name: req.user!.name },
    body,
  );
  res.json(m);
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
  const m = await getMeeting(String(req.params['id'] ?? ''));
  res.json(m);
});

router.patch('/:id', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const m = await patchMeeting(
    String(req.params['id'] ?? ''),
    { id: req.user!.id, role: req.workspaceRole! },
    req.body as Record<string, unknown>,
  );
  res.json(m);
});

router.post('/:id/join', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const result = await joinMeeting(String(req.params['id'] ?? ''), req.user!.id);
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
