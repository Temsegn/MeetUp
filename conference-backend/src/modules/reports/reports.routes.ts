import { Router } from 'express';
import { Types } from 'mongoose';
import { requireWorkspace } from '../workspace/workspace.middleware';
import { AuthRequest } from '../auth/auth.types';
import { buildReportsOverview, parseReportTypes } from './reports.service';

const router = Router();

/** Same workspace-wide reports for every member, admin, and owner. */
router.get('/overview', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const workspaceId = new Types.ObjectId(req.workspaceId!);
  const q = req.query as Record<string, string>;
  const range = parseInt(q.range ?? '30', 10);
  const types = parseReportTypes(q.types);
  const overview = await buildReportsOverview(workspaceId, range, types);
  res.json(overview);
});

export const reportsRouter = router;
