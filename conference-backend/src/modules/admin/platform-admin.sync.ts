import { User } from '../../database/models/User.model';
import { env } from '../../config/env';
import type { UserRecord } from '../auth/auth.types';

/** Promote configured emails to super_admin (idempotent). */
export async function syncPlatformAdminFromEnv(user: UserRecord): Promise<void> {
  const emails = env.PLATFORM_ADMIN_EMAILS.split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!emails.includes(user.email.toLowerCase())) return;
  if (user.platformRole === 'super_admin') return;
  await User.updateOne({ _id: user.id }, { $set: { platformRole: 'super_admin' } });
  user.platformRole = 'super_admin';
}

/**
 * Dev convenience: if no platform admin exists, promote the current user.
 * Production never auto-promotes without PLATFORM_ADMIN_EMAILS.
 */
export async function ensureDevPlatformAdmin(user: UserRecord): Promise<boolean> {
  if (env.NODE_ENV === 'production') return false;
  const existing = await User.exists({ platformRole: { $in: ['admin', 'super_admin'] } });
  if (existing) return false;
  await User.updateOne({ _id: user.id }, { $set: { platformRole: 'super_admin' } });
  user.platformRole = 'super_admin';
  return true;
}
