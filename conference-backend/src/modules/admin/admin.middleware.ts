import type { NextFunction, Response } from 'express';
import { ForbiddenError, AuthError } from '../../shared/errors/AppError';
import type { AuthRequest } from '../auth/auth.types';
import { syncPlatformAdminFromEnv } from './platform-admin.sync';

export async function requirePlatformAdmin(
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AuthError('Authentication required.');
    if (req.user.accountStatus === 'suspended' || req.user.accountStatus === 'banned') {
      throw new ForbiddenError('Account is not allowed to access the admin console.');
    }
    await syncPlatformAdminFromEnv(req.user);
    const role = req.user.platformRole;
    if (role !== 'admin' && role !== 'super_admin') {
      throw new ForbiddenError('Platform admin access required.');
    }
    next();
  } catch (err) {
    next(err);
  }
}
