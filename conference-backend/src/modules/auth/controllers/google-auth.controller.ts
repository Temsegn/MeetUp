import { Request, Response, NextFunction } from 'express';
import { env } from '../../../config/env';
import { AuthDeps, authRepository } from '../auth.repository';
import { createGoogleAuthService, isGoogleOAuthConfigured } from '../services/google-auth.service';
import { tokenService } from '../services/token.service';
import { getRequestContext } from '../auth.types';
import { setRefreshCookie } from '../security/cookie-config';

export function createGoogleAuthController(deps: AuthDeps = authRepository) {
  const google = createGoogleAuthService(deps);

  return {
    /** GET /auth/google — redirect to Google consent. */
    start(req: Request, res: Response, next: NextFunction): void {
      try {
        if (!isGoogleOAuthConfigured()) {
          res.redirect(`${env.FRONTEND_URL}/auth?error=google_not_configured`);
          return;
        }
        const url = google.getAuthorizationUrl();
        res.redirect(url);
      } catch (err) {
        next(err);
      }
    },

    /** GET /auth/google/callback — exchange code, set session, redirect to app. */
    async callback(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const code = typeof req.query.code === 'string' ? req.query.code : '';
        const state = typeof req.query.state === 'string' ? req.query.state : '';
        const oauthError = typeof req.query.error === 'string' ? req.query.error : '';

        if (oauthError || !code || !state) {
          res.redirect(`${env.FRONTEND_URL}/auth?error=google_denied`);
          return;
        }

        const ctx = getRequestContext(req);
        const { user, session } = await google.handleCallback(code, state, ctx);
        const tokens = tokenService.issueAccessToken(user.id, session.id);
        setRefreshCookie(res, session.refreshToken, session.expiresAt.getTime() - Date.now());

        // Access token cannot be set as HttpOnly from another origin easily —
        // hand it via hash (preferred) and query (fallback) so the SPA can store it.
        const redirect = new URL(`${env.FRONTEND_URL}/auth/oauth/callback`);
        redirect.searchParams.set('access_token', tokens.accessToken);
        redirect.hash = `access_token=${encodeURIComponent(tokens.accessToken)}`;
        res.redirect(redirect.toString());
      } catch (err) {
        // Prefer redirect over JSON so the browser UX stays on the SPA.
        const message = err instanceof Error ? err.message : 'google_failed';
        res.redirect(
          `${env.FRONTEND_URL}/auth?error=${encodeURIComponent('google_failed')}&detail=${encodeURIComponent(message)}`
        );
      }
    },
  };
}
