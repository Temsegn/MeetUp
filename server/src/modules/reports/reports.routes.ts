import { Router } from 'express';
import { Types } from 'mongoose';
import { requireWorkspace } from '../workspace/workspace.middleware';
import { AuthRequest } from '../auth/auth.types';
import { buildMeetingVisibilityFilter } from '../meetings/services/meeting-join-authz.service';
import { buildReportsOverview, parseReportTypes } from './reports.service';

const router = Router();

/** Admin sees every workspace meeting. Members see only their own, invited, and team meetings. */
router.get('/overview', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const workspaceId = new Types.ObjectId(req.workspaceId!);
  const q = req.query as Record<string, string>;
  const range = parseInt(q.range ?? '30', 10);
  const types = parseReportTypes(q.types);
  const visibility = await buildMeetingVisibilityFilter({
    workspaceId: req.workspaceId!,
    userId: req.user!.id,
    email: req.user!.email,
    role: req.workspaceRole,
  });
  const overview = await buildReportsOverview(workspaceId, range, types, visibility);
  res.json(overview);
});

export const reportsRouter = router;
