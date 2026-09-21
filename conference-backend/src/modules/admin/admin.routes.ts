import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware';
import type { AuthRequest } from '../auth/auth.types';
import { requirePlatformAdmin } from './admin.middleware';
import { adminService } from './admin.service';
import type { PlanKey } from '../../database/models/Plan.model';

export const adminRouter = Router();

adminRouter.use(authenticate);

adminRouter.post('/claim-dev-access', async (req: AuthRequest, res, next) => {
  try {
    const result = await adminService.claimDevAccess(req.user!);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

adminRouter.use(requirePlatformAdmin);

adminRouter.get('/overview', async (_req, res, next) => {
  try {
    res.json(await adminService.overview());
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/workspaces', async (req, res, next) => {
  try {
    res.json(
      await adminService.listWorkspaces({
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        plan: typeof req.query.plan === 'string' ? req.query.plan : undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      }),
    );
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/workspaces/:id', async (req, res, next) => {
  try {
    res.json(await adminService.getWorkspace(String(req.params.id)));
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/workspaces', async (req: AuthRequest, res, next) => {
  try {
    const body = req.body as {
      name: string;
      slug: string;
      email?: string;
      phone?: string;
      description?: string;
      industry?: string;
      organizationSize?: string;
      logoUrl?: string | null;
      ownerName?: string;
      ownerEmail: string;
      planKey?: PlanKey;
    };
    res.status(201).json(await adminService.createWorkspace(req.user!, body, req.ip));
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/workspaces/:id/status', async (req: AuthRequest, res, next) => {
  try {
    const status = (req.body as { status?: 'active' | 'suspended' }).status;
    if (status !== 'active' && status !== 'suspended') {
      res.status(400).json({ error: 'status must be active or suspended' });
      return;
    }
    res.json(await adminService.setWorkspaceStatus(req.user!, String(req.params.id), status, req.ip));
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/users', async (req, res, next) => {
  try {
    res.json(
      await adminService.listUsers({
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      }),
    );
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/users/:id', async (req, res, next) => {
  try {
    res.json(await adminService.getUser(String(req.params.id)));
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/users', async (req: AuthRequest, res, next) => {
  try {
    res.status(201).json(await adminService.createUser(req.user!, req.body, req.ip));
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/users/:id/status', async (req: AuthRequest, res, next) => {
  try {
    const accountStatus = (req.body as { accountStatus?: 'active' | 'suspended' | 'banned' })
      .accountStatus;
    if (accountStatus !== 'active' && accountStatus !== 'suspended' && accountStatus !== 'banned') {
      res.status(400).json({ error: 'Invalid accountStatus' });
      return;
    }
    res.json(
      await adminService.setUserStatus(req.user!, String(req.params.id), accountStatus, req.ip),
    );
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/plans', async (_req, res, next) => {
  try {
    res.json(await adminService.listPlans());
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/plans/:key', async (req: AuthRequest, res, next) => {
  try {
    const key = String(req.params.key) as PlanKey;
    if (key !== 'free' && key !== 'pro' && key !== 'enterprise') {
      res.status(400).json({ error: 'Invalid plan key' });
      return;
    }
    res.json(await adminService.updatePlan(req.user!, key, req.body, req.ip));
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/subscriptions', async (req, res, next) => {
  try {
    res.json(
      await adminService.listSubscriptions({
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        plan: typeof req.query.plan === 'string' ? req.query.plan : undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      }),
    );
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/billing', async (_req, res, next) => {
  try {
    res.json(await adminService.billingOverview());
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/invoices', async (req, res, next) => {
  try {
    res.json(
      await adminService.listInvoices({
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      }),
    );
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/audit-logs', async (req, res, next) => {
  try {
    res.json(
      await adminService.listAuditLogs({
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      }),
    );
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/system-settings', async (_req, res, next) => {
  try {
    res.json(await adminService.getSystemSettings());
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/system-settings', async (req: AuthRequest, res, next) => {
  try {
    res.json(await adminService.updateSystemSettings(req.user!, req.body, req.ip));
  } catch (err) {
    next(err);
  }
});
