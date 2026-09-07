import { createHash, randomBytes } from 'crypto';
import { AppError, ConflictError } from '../../../shared/errors/AppError';
import { env } from '../../../config/env';
import { AuthDeps, authRepository } from '../auth.repository';
import { createSessionService } from './session.service';
import { normalizeEmail } from '../auth.constants';
import { RequestContext, UserRecord } from '../auth.types';
import { ensureWorkspaceForUser } from '../../workspace/org.bootstrap';

const STATE_TTL_MS = 10 * 60 * 1000;
const pendingStates = new Map<string, { exp: number }>();

function pruneStates() {
  const now = Date.now();
  for (const [k, v] of pendingStates) {
    if (v.exp < now) pendingStates.delete(k);
  }
}

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

export function createGoogleAuthService(deps: AuthDeps = authRepository) {
  const sessions = createSessionService(deps);

  return {
    getAuthorizationUrl(): string {
      if (!isGoogleOAuthConfigured()) {
        throw new AppError('Google sign-in is not configured.', 'GOOGLE_NOT_CONFIGURED', 503);
      }
      pruneStates();
      const state = randomBytes(24).toString('hex');
      pendingStates.set(state, { exp: Date.now() + STATE_TTL_MS });

      const params = new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID!,
        redirect_uri: env.GOOGLE_REDIRECT_URI!,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'online',
        prompt: 'select_account',
        state,
      });
      return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    },

    async handleCallback(
      code: string,
      state: string,
      ctx?: RequestContext
    ): Promise<{
      user: UserRecord;
      session: { id: string; refreshToken: string; rememberMe: boolean; expiresAt: Date };
    }> {
      if (!isGoogleOAuthConfigured()) {
        throw new AppError('Google sign-in is not configured.', 'GOOGLE_NOT_CONFIGURED', 503);
      }

      const pending = pendingStates.get(state);
      pendingStates.delete(state);
      if (!pending || pending.exp < Date.now()) {
        throw new AppError('Invalid or expired Google sign-in state.', 'GOOGLE_STATE_INVALID', 400);
      }

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: env.GOOGLE_CLIENT_ID!,
          client_secret: env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: env.GOOGLE_REDIRECT_URI!,
          grant_type: 'authorization_code',
        }),
      });
      if (!tokenRes.ok) {
        throw new AppError('Could not complete Google sign-in.', 'GOOGLE_TOKEN_FAILED', 502);
      }
      const tokenJson = (await tokenRes.json()) as { access_token?: string };
      if (!tokenJson.access_token) {
        throw new AppError('Could not complete Google sign-in.', 'GOOGLE_TOKEN_FAILED', 502);
      }

      const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenJson.access_token}` },
      });
      if (!profileRes.ok) {
        throw new AppError('Could not load Google profile.', 'GOOGLE_PROFILE_FAILED', 502);
      }
      const profile = (await profileRes.json()) as {
        sub?: string;
        email?: string;
        email_verified?: boolean;
        name?: string;
        picture?: string;
      };

      if (!profile.sub || !profile.email) {
        throw new AppError('Google account is missing email.', 'GOOGLE_EMAIL_REQUIRED', 400);
      }

      const email = normalizeEmail(profile.email);
      let user =
        (await deps.findUserByGoogleId(profile.sub)) ?? (await deps.findUserByEmail(email));

      if (user) {
        const patch: {
          googleId?: string | null;
          authProvider?: 'local' | 'google';
          emailVerifiedAt?: Date | null;
          name?: string;
          avatarUrl?: string | null;
        } = {};
        if (!user.googleId) patch.googleId = profile.sub;
        if (user.authProvider !== 'google' && !user.passwordHash) patch.authProvider = 'google';
        if (!user.emailVerifiedAt && profile.email_verified) patch.emailVerifiedAt = new Date();
        if (!user.name && profile.name) patch.name = profile.name;
        if (!user.avatarUrl && profile.picture) patch.avatarUrl = profile.picture;
        if (Object.keys(patch).length > 0) {
          user = (await deps.updateUserProfile(user.id, patch)) ?? user;
        }
      } else {
        try {
          user = await deps.createUser({
            name: (profile.name || email.split('@')[0]).trim().slice(0, 100),
            email,
            passwordHash: '',
            authProvider: 'google',
            googleId: profile.sub,
            emailVerifiedAt: profile.email_verified ? new Date() : new Date(),
            avatarUrl: profile.picture || null,
          });
        } catch (err: unknown) {
          const e = err as { code?: number };
          if (e?.code === 11000) {
            throw new ConflictError(
              'An account with this email already exists. Try signing in instead.'
            );
          }
          throw err;
        }
      }

      await ensureWorkspaceForUser(user);

      const { session, refreshToken } = await sessions.createSession({
        userId: user.id,
        rememberMe: true,
        ctx,
      });

      deps.audit({
        action: 'LOGIN_SUCCESS',
        userId: user.id,
        email: user.email,
        ip: ctx?.ip,
        userAgent: ctx?.userAgent,
        metadata: { provider: 'google' },
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

/** Deterministic unused helper export for tests that need stable state keys. */
export function hashOAuthState(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}
