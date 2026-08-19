import { AppError, AuthError } from '../../../shared/errors/AppError';
import { AuthDeps, authRepository } from '../auth.repository';
import { verifyPassword } from '../security/password-hasher';
import {
  LOGIN_LOCKOUT_WINDOW_MS,
  LOGIN_MAX_FAILED_ATTEMPTS,
  normalizeEmail,
} from '../auth.constants';
import { createSessionService } from './session.service';
import { RequestContext, UserRecord } from '../auth.types';

/**
 * Login.
 *
 * Anti-abuse design:
 *  - Generic "Invalid email or password" for BOTH unknown emails and wrong
 *    passwords — no account-enumeration oracle.
 *  - Per-(email, IP) failed-attempt lockout backed by LoginAttempt records.
 *    Attempts for NON-EXISTENT emails are recorded too, so the lockout
 *    response cannot reveal which emails exist.
 *  - Per-IP rate limiting is applied at the middleware layer (express-rate-limit).
 *  - The bcrypt compare only runs when the account exists; a dummy compare
 *    is not needed because the generic error already hides existence.
 */

export interface LoginResult {
  user: UserRecord;
  session: { id: string; refreshToken: string; rememberMe: boolean; expiresAt: Date };
}

export function createLoginService(deps: AuthDeps = authRepository) {
  const sessions = createSessionService(deps);

  return {
    async login(input: {
      email: string;
      password: string;
      rememberMe: boolean;
      ctx?: RequestContext;
    }): Promise<LoginResult> {
      const email = normalizeEmail(input.email);
      const ip = input.ctx?.ip ?? 'unknown';

      // Lockout check runs BEFORE credential verification, for every email,
      // so throttling is identical for known and unknown accounts.
      const recentFailures = await deps.countRecentLoginFailures(
        email,
        ip,
        LOGIN_LOCKOUT_WINDOW_MS
      );
      if (recentFailures >= LOGIN_MAX_FAILED_ATTEMPTS) {
        deps.audit({
          action: 'LOGIN_LOCKED',
          email,
          ip,
          userAgent: input.ctx?.userAgent,
          metadata: { recentFailures },
        });
        throw new AppError(
          'Too many login attempts. Please try again in a few minutes.',
          'LOGIN_LOCKED',
          429
        );
      }

      const user = await deps.findUserByEmail(email);
      const valid = user ? await verifyPassword(input.password, user.passwordHash) : false;

      if (!user || !valid) {
        await deps.recordLoginAttempt({ email, ip, succeeded: false });
        deps.audit({
          action: 'LOGIN_FAILED',
          email,
          ip,
          userAgent: input.ctx?.userAgent,
        });
        throw new AuthError('Invalid email or password.', 'INVALID_CREDENTIALS');
      }

      await deps.recordLoginAttempt({ email, ip, succeeded: true });
      deps.audit({
        action: 'LOGIN_SUCCESS',
        userId: user.id,
        email: user.email,
        ip,
        userAgent: input.ctx?.userAgent,
      });

      const { session, refreshToken } = await sessions.createSession({
        userId: user.id,
        rememberMe: input.rememberMe,
        ctx: input.ctx,
      });

      return {
        user,
        session: {
          id: session.id,
          refreshToken,
          rememberMe: session.rememberMe,
          expiresAt: session.expiresAt,
        },
      };
    },
  };
}
