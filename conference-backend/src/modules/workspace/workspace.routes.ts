import { Router } from 'express';
import { authenticate } from '../auth/middleware/authenticate.middleware';
import { AuthRequest } from '../auth/auth.types';
import { requireWorkspace } from './workspace.middleware';
import { workspaceService } from './workspace.service';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res) => {
  const memberships = await workspaceService.listMine(req.user!);
  res.json({ workspaces: memberships });
});

router.post('/invites/accept', authenticate, async (req: AuthRequest, res) => {
  const token = String((req.body as { token?: string })?.token ?? '');
  const result = await workspaceService.acceptInvite(req.user!, token);
  res.json(result);
});

router.get('/invites/preview', async (req, res) => {
  const token = String((req.query as { token?: string }).token ?? '');
  const preview = await workspaceService.previewInvite(token);
  res.json(preview);
});

router.post('/invites/join', async (req, res) => {
  const body = req.body as {
    token?: string;
    name?: string;
    password?: string;
    temporaryPassword?: string;
  };
  const result = await workspaceService.joinWithInvite({
    token: body.token ?? '',
    name: body.name,
    password: body.password ?? '',
    temporaryPassword: body.temporaryPassword,
  });
  res.status(201).json(result);
});

router.post('/invites/complete-password', async (req, res) => {
  const body = req.body as {
    email?: string;
    temporaryPassword?: string;
    newPassword?: string;
  };
  const result = await workspaceService.completeInvitedPassword({
    email: body.email ?? '',
    temporaryPassword: body.temporaryPassword ?? '',
    newPassword: body.newPassword ?? '',
  });
  res.status(201).json(result);
});

router.get('/:id', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const ws = await workspaceService.get(String(req.params['id'] ?? ''));
  res.json(ws);
});

router.patch('/:id/settings', requireWorkspace('admin'), async (req: AuthRequest, res) => {
  const body = req.body as {
    name?: string;
    slug?: string;
    email?: string;
    logoUrl?: string | null;
    waitingRoom?: boolean;
    autoRecord?: boolean;
    joinBeforeHost?: boolean;
    muteOnEntry?: boolean;
    maxMeetingDurationMinutes?: number;
    language?: string;
  };
  const ws = await workspaceService.updateSettings(req.workspaceId!, req.workspaceRole!, body);
  res.json(ws);
});

router.get('/:id/members', requireWorkspace('admin'), async (req: AuthRequest, res) => {
  const members = await workspaceService.listMembers(req.workspaceId!);
  res.json({ members });
});

router.get('/:id/directory', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const members = await workspaceService.listDirectory(req.workspaceId!);
  res.json({ members });
});

router.get('/:id/invites', requireWorkspace('admin'), async (req: AuthRequest, res) => {
  const invites = await workspaceService.listPendingInvites(req.workspaceId!);
  res.json({ invites });
});

router.post('/:id/invites', requireWorkspace('admin'), async (req: AuthRequest, res) => {
  const body = req.body as {
    name?: string;
    email?: string;
    phone?: string;
    role?: 'admin' | 'member';
  };
  const invite = await workspaceService.invite(
    req.workspaceId!,
    { id: req.user!.id, role: req.workspaceRole!, name: req.user!.name },
    {
      name: body.name ?? '',
      email: body.email ?? '',
      phone: body.phone,
      role: body.role,
    },
  );
  res.status(201).json(invite);
});

router.delete('/:id/invites/:inviteId', requireWorkspace('admin'), async (req: AuthRequest, res) => {
  const result = await workspaceService.revokeInvite(
    req.workspaceId!,
    req.workspaceRole!,
    String(req.params['inviteId'] ?? ''),
  );
  res.json(result);
});

router.patch('/:id/invites/:inviteId', requireWorkspace('admin'), async (req: AuthRequest, res) => {
  const body = req.body as {
    name?: string;
    email?: string;
    phone?: string;
    role?: 'admin' | 'member';
  };
  const result = await workspaceService.updateInvite(
    req.workspaceId!,
    { id: req.user!.id, role: req.workspaceRole!, name: req.user!.name },
    String(req.params['inviteId'] ?? ''),
    body,
  );
  res.json(result);
});

router.post('/:id/invites/:inviteId/resend', requireWorkspace('admin'), async (req: AuthRequest, res) => {
  const result = await workspaceService.resendInvite(
    req.workspaceId!,
    { id: req.user!.id, role: req.workspaceRole!, name: req.user!.name },
    String(req.params['inviteId'] ?? ''),
  );
  res.json(result);
});

router.patch('/:id/members/:userId/role', requireWorkspace('owner'), async (req: AuthRequest, res) => {
  const role = (req.body as { role?: 'admin' | 'member' }).role ?? 'member';
  const member = await workspaceService.changeRole(
    req.workspaceId!,
    req.workspaceRole!,
    String(req.params['userId'] ?? ''),
    role,
  );
  res.json(member);
});

router.patch('/:id/members/:userId', requireWorkspace('admin'), async (req: AuthRequest, res) => {
  const body = req.body as {
    name?: string;
    phone?: string;
    jobTitle?: string;
    department?: string;
    role?: 'admin' | 'member';
  };
  const member = await workspaceService.updateMember(
    req.workspaceId!,
    { id: req.user!.id, role: req.workspaceRole! },
    String(req.params['userId'] ?? ''),
    body,
  );
  res.json(member);
});

router.patch('/:id/members/:userId/status', requireWorkspace('admin'), async (req: AuthRequest, res) => {
  const status = (req.body as { status?: 'active' | 'inactive' }).status ?? 'inactive';
  if (status !== 'active' && status !== 'inactive') {
    res.status(400).json({ error: 'status must be active or inactive' });
    return;
  }
  const member = await workspaceService.setMemberStatus(
    req.workspaceId!,
    { id: req.user!.id, role: req.workspaceRole! },
    String(req.params['userId'] ?? ''),
    status,
  );
  res.json(member);
});

router.delete('/:id/members/:userId', requireWorkspace('admin'), async (req: AuthRequest, res) => {
  const result = await workspaceService.removeMember(
    req.workspaceId!,
    { id: req.user!.id, role: req.workspaceRole! },
    String(req.params['userId'] ?? ''),
  );
  res.json(result);
});

export const workspaceRouter = router;
