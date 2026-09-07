import { Router } from 'express';
import { requireWorkspace } from '../workspace/workspace.middleware';
import { AuthRequest } from '../auth/auth.types';
import { createWorkspaceTeam, listWorkspaceTeams } from './workspace-teams.service';

const router = Router();

router.get('/', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const q = req.query as Record<string, string>;
  const teams = await listWorkspaceTeams({
    workspaceId: req.workspaceId!,
    q: q.q,
    status: q.status,
  });
  res.json({ teams });
});

router.post('/', requireWorkspace('admin'), async (req: AuthRequest, res) => {
  const body = req.body as {
    name?: string;
    teamId?: string;
    description?: string;
    department?: string;
    visibility?: 'workspace' | 'private';
    leadUserId?: string | null;
    memberIds?: string[];
    settings?: {
      membersCanInvite?: boolean;
      requireJoinApproval?: boolean;
      notifyOnChanges?: boolean;
      canCreateMeetings?: boolean;
    };
  };

  const team = await createWorkspaceTeam({
    workspaceId: req.workspaceId!,
    userId: req.user!.id,
    name: body.name ?? '',
    teamId: body.teamId ?? '',
    description: body.description,
    department: body.department,
    visibility: body.visibility,
    leadUserId: body.leadUserId,
    memberIds: body.memberIds,
    settings: body.settings,
  });
  res.status(201).json(team);
});

export const workspaceTeamsRouter = router;
