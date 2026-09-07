import { Router } from 'express';
import { AuthRequest } from '../auth/auth.types';
import { requireWorkspace } from '../workspace/workspace.middleware';
import { billingService } from './billing.service';
import type { PlanKey } from '../../database/models/Plan.model';

const router = Router();

router.get('/plans', requireWorkspace('member'), async (_req: AuthRequest, res) => {
  const plans = await billingService.listPlans();
  res.json({ plans });
});

router.get('/plan', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const data = await billingService.getPlan(req.workspaceId!);
  res.json(data);
});

router.get('/usage', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const data = await billingService.getUsage(req.workspaceId!);
  res.json(data);
});

router.get('/usage/meetings', requireWorkspace('admin'), async (req: AuthRequest, res) => {
  const data = await billingService.getUsageByMeeting(req.workspaceId!);
  res.json({ meetings: data });
});

router.patch('/plan', requireWorkspace('owner'), async (req: AuthRequest, res) => {
  const planKey = (req.body as { planKey?: PlanKey }).planKey ?? 'free';
  const data = await billingService.changePlan(req.workspaceId!, req.workspaceRole!, planKey);
  res.json(data);
});

export const billingRouter = router;
