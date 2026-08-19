import { ConflictError } from '../../../shared/errors/AppError';
import { AuthDeps, authRepository } from '../auth.repository';
import { assertPasswordStrength } from './password.service';
import { hashPassword } from '../security/password-hasher';
import { generateSecureToken } from '../security/token-generator';
import { hashToken } from '../security/token-hasher';
import { EMAIL_VERIFICATION_TOKEN_TTL_SECONDS, normalizeEmail } from '../auth.constants';
import { emailService } from './email.service';
import { createSessionService } from './session.service';
import { verificationEmail } from '../templates/verification-email';
import { welcomeEmail } from '../templates/welcome-email';
import { RequestContext, UserRecord } from '../auth.types';

/**
 * Account registration.
 *
 * Responsibilities: normalize + uniqueness check (with a race-safe unique
 * index backstop), secure hashing, email-verification token issuance,
 * welcome/verification emails, and an auto-login session so the user lands
 * in the app with a "verify your email" banner.
 */

export interface SignupResult {
  user: UserRecord;
  session: { id: string; refreshToken: string; rememberMe: boolean; expiresAt: Date };
}

const isDuplicateKeyError = (err: unknown): boolean => {
  const e = err as { code?: number };
  return e?.code === 11000;
};

export function createSignupService(deps: AuthDeps = authRepository) {
  const sessions = createSessionService(deps);

  return {
    async signup(input: {
      name: string;
      email: string;
      password: string;
      rememberMe: boolean;
      ctx?: RequestContext;
    }): Promise<SignupResult> {
      const email = normalizeEmail(input.email);
      assertPasswordStrength(input.password);

      const existing = await deps.findUserByEmail(email);
      if (existing) {
        deps.audit({
          action: 'SIGNUP_DUPLICATE',
          email,
          ip: input.ctx?.ip,
          userAgent: input.ctx?.userAgent,
        });
        // Same message as a fresh-email success would never return, but it is
        // identical to the login-time message — this is an intentional,
        // documented enumeration trade-off at signup (creating an account for
        // a taken email must fail loudly for the legitimate owner).
        throw new ConflictError(
          'An account with this email already exists. Try signing in instead.'
        );
      }

      const passwordHash = await hashPassword(input.password);
      let user: UserRecord;
      try {
        user = await deps.createUser({ name: input.name.trim(), email, passwordHash });
      } catch (err: unknown) {
        if (isDuplicateKeyError(err)) {
          throw new ConflictError(
            'An account with this email already exists. Try signing in instead.'
          );
        }
        throw err;
      }

      // ── Emails (best-effort; failures must not block signup) ────────────
      const rawToken = generateSecureToken();
      await deps.createEmailVerificationToken({
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_SECONDS * 1000),
      });
      await safeSend(
        () => emailService.send({ to: user.email, ...verificationEmail(user, rawToken) }),
        'verification email',
        user.id
      );
      await safeSend(
        () => emailService.send({ to: user.email, ...welcomeEmail(user) }),
        'welcome email',
        user.id
      );

      deps.audit({
        action: 'EMAIL_VERIFICATION_SENT',
        userId: user.id,
        ip: input.ctx?.ip,
        userAgent: input.ctx?.userAgent,
      });

      // ── Auto-login session ──────────────────────────────────────────────
      const { session, refreshToken } = await sessions.createSession({
        userId: user.id,
        rememberMe: input.rememberMe,
        ctx: input.ctx,
      });

      deps.audit({
        action: 'SIGNUP',
        userId: user.id,
        email: user.email,
        ip: input.ctx?.ip,
        userAgent: input.ctx?.userAgent,
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

async function safeSend(
  send: () => Promise<void>,
  label: string,
  userId: string
): Promise<void> {
  try {
    await send();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`Failed to send ${label}`, {
      userId,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}
