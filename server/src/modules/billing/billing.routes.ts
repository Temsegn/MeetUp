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

/** Pay with a card to move onto a paid plan. Card number is never stored. */
router.post('/upgrade', requireWorkspace('owner'), async (req: AuthRequest, res) => {
  const body = req.body as { planKey?: PlanKey; card?: unknown };
  const planKey = body.planKey ?? 'pro';
  const data = await billingService.upgradePlan(
    req.workspaceId!,
    req.workspaceRole!,
    planKey,
    body.card,
  );
  res.json(data);
});

/** Invoices generated from plan + usage. */
router.get('/invoices', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const data = await billingService.listInvoices(req.workspaceId!);
  res.json(data);
});

router.get('/invoices/:invoiceId', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const data = await billingService.getInvoice(req.workspaceId!, String(req.params.invoiceId));
  res.json(data);
});

router.post('/invoices/:invoiceId/pay', requireWorkspace('admin'), async (req: AuthRequest, res) => {
  const data = await billingService.payInvoice(
    req.workspaceId!,
    String(req.params.invoiceId),
    req.workspaceRole!,
    (req.body as { card?: unknown })?.card,
  );
  res.json(data);
});

router.get('/payment-methods', requireWorkspace('member'), async (req: AuthRequest, res) => {
  const data = await billingService.listPaymentMethods(req.workspaceId!);
  res.json(data);
});

router.post('/payment-methods', requireWorkspace('admin'), async (req: AuthRequest, res) => {
  const data = await billingService.addPaymentMethod(
    req.workspaceId!,
    req.workspaceRole!,
    (req.body as { card?: unknown })?.card ?? req.body,
  );
  res.json(data);
});

export const billingRouter = router;
