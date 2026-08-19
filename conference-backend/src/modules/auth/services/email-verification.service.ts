import { AppError } from '../../../shared/errors/AppError';
import { AuthDeps, authRepository } from '../auth.repository';
import { generateSecureToken } from '../security/token-generator';
import { hashToken } from '../security/token-hasher';
import { EMAIL_VERIFICATION_TOKEN_TTL_SECONDS } from '../auth.constants';
import { emailService } from './email.service';
import { verificationEmail } from '../templates/verification-email';
import { RequestContext, UserRecord } from '../auth.types';

/**
 * Email verification lifecycle: issuing tokens and consuming them.
 *
 * Tokens are opaque, single-use, hashed at rest, and expire after 24h.
 * Each new send revokes outstanding tokens so only the latest link works.
 */

export function createEmailVerificationService(deps: AuthDeps = authRepository) {
  return {
    /** Issue a fresh verification token and email it. No-op if already verified. */
    async sendVerification(input: {
      user: UserRecord;
      ctx?: RequestContext;
    }): Promise<{ alreadyVerified: boolean }> {
      const { user, ctx } = input;
      if (user.emailVerifiedAt) return { alreadyVerified: true };

      await deps.revokeUserEmailVerificationTokens(user.id);

      const rawToken = generateSecureToken();
      await deps.createEmailVerificationToken({
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_SECONDS * 1000),
      });

      try {
        await emailService.send({ to: user.email, ...verificationEmail(user, rawToken) });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to send verification email', {
          userId: user.id,
          err: err instanceof Error ? err.message : String(err),
        });
      }

      deps.audit({
        action: 'EMAIL_VERIFICATION_SENT',
        userId: user.id,
        ip: ctx?.ip,
        userAgent: ctx?.userAgent,
      });

      return { alreadyVerified: false };
    },

    /** Validate + consume a verification token, marking the email verified. */
    async verify(input: { token: string; ctx?: RequestContext }): Promise<{ user: UserRecord }> {
      const tokenHash = hashToken(input.token);
      const record = await deps.findEmailVerificationTokenByHash(tokenHash);

      const invalid = (): AppError => {
        deps.audit({
          action: 'EMAIL_VERIFICATION_INVALID',
          ip: input.ctx?.ip,
          userAgent: input.ctx?.userAgent,
        });
        return new AppError(
          'This verification link is invalid or has already been used.',
          'INVALID_VERIFICATION_TOKEN',
          400
        );
      };

      if (!record) throw invalid();
      if (record.usedAt) throw invalid();
      if (record.expiresAt.getTime() <= Date.now()) throw invalid();

      const user = await deps.findUserById(record.userId);
      if (!user) throw invalid();
      if (user.emailVerifiedAt) {
        // Idempotent: already verified — treat as success, consume the token.
        await deps.markEmailVerificationTokenUsed(record.id, new Date());
        return { user };
      }

      const verifiedAt = new Date();
      await deps.markEmailVerified(user.id, verifiedAt);
      await deps.markEmailVerificationTokenUsed(record.id, new Date());

      deps.audit({
        action: 'EMAIL_VERIFIED',
        userId: user.id,
        email: user.email,
        ip: input.ctx?.ip,
        userAgent: input.ctx?.userAgent,
      });

      // Re-fetch so the response reflects the just-applied verification.
      const updated = await deps.findUserById(user.id);
      return { user: updated ?? { ...user, emailVerifiedAt: verifiedAt } };
    },
  };
}
