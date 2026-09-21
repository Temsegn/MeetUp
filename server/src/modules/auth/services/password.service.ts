import { AppError, ValidationError } from '../../../shared/errors/AppError';
import { AuthDeps, authRepository } from '../auth.repository';
import {
  hashPassword,
  verifyPassword,
  isSamePassword,
} from '../security/password-hasher';
import { PASSWORD_POLICY } from '../auth.constants';
import { tokenService } from './token.service';
import { RequestContext } from '../auth.types';

/**
 * Password management: strength policy, hashing, and the authenticated
 * change-password flow (requires the current password).
 */

export function createPasswordService(deps: AuthDeps = authRepository) {
  return {
    /**
     * Change password for an authenticated user.
     *
     * Design decisions (documented):
     *  - Requires the CURRENT password (proves ownership of the session).
     *  - Rejects reusing the current password.
     *  - Sets `passwordChangedAt`, which invalidates every access token
     *    issued before the change (checked by the authenticate middleware).
     *  - Revokes all OTHER refresh sessions; the CURRENT session is kept so
     *    the user is not logged out by their own security action. The new
     *    access token returned here carries a post-change `iat`.
     */
    async changePassword(opts: {
      userId: string;
      currentPassword: string;
      newPassword: string;
      keepSessionId?: string;
      ctx?: RequestContext;
    }): Promise<{ accessToken: string; expiresIn: number }> {
      const user = await deps.findUserById(opts.userId);
      if (!user) throw new AppError('Account not found.', 'USER_NOT_FOUND', 404);

      const currentOk = await verifyPassword(opts.currentPassword, user.passwordHash);
      if (!currentOk) {
        deps.audit({
          action: 'ACCESS_DENIED',
          userId: user.id,
          ip: opts.ctx?.ip,
          userAgent: opts.ctx?.userAgent,
          metadata: { reason: 'change_password_wrong_current' },
        });
        throw new AppError('Current password is incorrect.', 'CURRENT_PASSWORD_INCORRECT', 400);
      }

      assertPasswordStrength(opts.newPassword);

      const reuse = await isSamePassword(opts.newPassword, user.passwordHash);
      if (reuse) {
        throw new ValidationError(
          'New password must be different from the current password.',
          'PASSWORD_REUSE'
        );
      }

      const newHash = await hashPassword(opts.newPassword);
      await deps.updateUserPassword(user.id, newHash, new Date());

      // Revoke every other device; keep this session alive (explicit choice).
      await deps.revokeUserSessions(user.id, {
        exceptSessionId: opts.keepSessionId,
        reason: 'password_changed',
        at: new Date(),
      });

      deps.audit({
        action: 'PASSWORD_CHANGED',
        userId: user.id,
        ip: opts.ctx?.ip,
        userAgent: opts.ctx?.userAgent,
        metadata: { sessionId: opts.keepSessionId },
      });

      const sessionId = opts.keepSessionId ?? '';
      return tokenService.issueAccessToken(user.id, sessionId);
    },
  };
}

/** Shared strength assertion (also enforced by zod validators on the wire). */
export function assertPasswordStrength(password: string): void {
  if (
    typeof password !== 'string' ||
    password.length < PASSWORD_POLICY.minLength ||
    password.length > PASSWORD_POLICY.maxLength
  ) {
    throw new ValidationError(
      `Password must be between ${PASSWORD_POLICY.minLength} and ${PASSWORD_POLICY.maxLength} characters.`,
      'WEAK_PASSWORD'
    );
  }
  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    throw new ValidationError('Password must contain at least one lowercase letter.', 'WEAK_PASSWORD');
  }
  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    throw new ValidationError('Password must contain at least one uppercase letter.', 'WEAK_PASSWORD');
  }
  if (PASSWORD_POLICY.requireDigit && !/[0-9]/.test(password)) {
    throw new ValidationError('Password must contain at least one number.', 'WEAK_PASSWORD');
  }
}
