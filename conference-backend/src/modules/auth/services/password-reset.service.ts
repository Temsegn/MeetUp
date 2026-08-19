import { AppError, ValidationError } from '../../../shared/errors/AppError';
import { AuthDeps, authRepository } from '../auth.repository';
import { hashPassword, isSamePassword } from '../security/password-hasher';
import { generateSecureToken } from '../security/token-generator';
import { hashToken } from '../security/token-hasher';
import { PASSWORD_RESET_TOKEN_TTL_SECONDS, normalizeEmail } from '../auth.constants';
import { emailService } from './email.service';
import { assertPasswordStrength } from './password.service';
import { passwordResetEmail } from '../templates/password-reset-email';
import { RequestContext } from '../auth.types';

/**
 * Password reset (forgot password).
 *
 *  - requestReset ALWAYS resolves the same way — the response cannot be used
 *    to enumerate accounts.
 *  - Tokens are opaque, single-use, hashed at rest, and expire after 30 min.
 *  - A successful reset revokes ALL sessions (every device must re-authenticate)
 *    and marks the token consumed immediately.
 */

export function createPasswordResetService(deps: AuthDeps = authRepository) {
  return {
    /** Request a reset email. Returns a generic success regardless of existence. */
    async requestReset(input: {
      email: string;
      ctx?: RequestContext;
    }): Promise<{ ok: true }> {
      const email = normalizeEmail(input.email);
      const user = await deps.findUserByEmail(email);

      if (user) {
        // Single active link per account: revoke outstanding tokens first.
        await deps.revokeUserPasswordResetTokens(user.id);

        const rawToken = generateSecureToken();
        await deps.createPasswordResetToken({
          userId: user.id,
          tokenHash: hashToken(rawToken),
          expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_SECONDS * 1000),
        });

        try {
          await emailService.send({ to: user.email, ...passwordResetEmail(user, rawToken) });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('Failed to send password reset email', {
            userId: user.id,
            err: err instanceof Error ? err.message : String(err),
          });
        }

        deps.audit({
          action: 'PASSWORD_RESET_REQUESTED',
          userId: user.id,
          ip: input.ctx?.ip,
          userAgent: input.ctx?.userAgent,
        });
      }

      return { ok: true };
    },

    /** Consume a reset token and set a new password. */
    async resetPassword(input: {
      token: string;
      newPassword: string;
      ctx?: RequestContext;
    }): Promise<{ ok: true }> {
      const tokenHash = hashToken(input.token);
      assertPasswordStrength(input.newPassword);
      const record = await deps.findPasswordResetTokenByHash(tokenHash);

      const invalid = (): AppError => {
        deps.audit({
          action: 'PASSWORD_RESET_TOKEN_INVALID',
          ip: input.ctx?.ip,
          userAgent: input.ctx?.userAgent,
        });
        return new AppError(
          'This reset link is invalid or has already been used. Request a new one.',
          'INVALID_RESET_TOKEN',
          400
        );
      };

      if (!record) throw invalid();
      if (record.usedAt) throw invalid();
      if (record.expiresAt.getTime() <= Date.now()) throw invalid();

      const user = await deps.findUserById(record.userId);
      if (!user) throw invalid();

      // The user just proved control of the inbox — still reject reusing the
      // current password so a leaked reset email cannot force a no-op reset.
      const reuse = await isSamePassword(input.newPassword, user.passwordHash);
      if (reuse) {
        throw new ValidationError(
          'New password must be different from the current password.',
          'PASSWORD_REUSE'
        );
      }

      const newHash = await hashPassword(input.newPassword);
      await deps.updateUserPassword(user.id, newHash, new Date());
      await deps.markPasswordResetTokenUsed(record.id, new Date());

      // Invalidate every device — password reset revokes all sessions.
      await deps.revokeUserSessions(user.id, { reason: 'password_reset', at: new Date() });

      deps.audit({
        action: 'PASSWORD_RESET_COMPLETED',
        userId: user.id,
        ip: input.ctx?.ip,
        userAgent: input.ctx?.userAgent,
      });

      return { ok: true };
    },
  };
}
