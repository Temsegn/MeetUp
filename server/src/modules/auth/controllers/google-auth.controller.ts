import { Request, Response, NextFunction } from 'express';
import { publicFrontendUrl } from '../../../config/env';
import { AuthDeps, authRepository } from '../auth.repository';
import { createGoogleAuthService, isGoogleOAuthConfigured } from '../services/google-auth.service';
import { tokenService } from '../services/token.service';
import { getRequestContext } from '../auth.types';
import {
  OAUTH_STATE_COOKIE_NAME,
  clearOAuthStateCookie,
  readCookie,
  setOAuthStateCookie,
  setRefreshCookie,
} from '../security/cookie-config';
import { createOAuthState } from '../security/oauth-state';

export function createGoogleAuthController(deps: AuthDeps = authRepository) {
  const google = createGoogleAuthService(deps);

  return {
    /** GET /auth/google — redirect to Google consent. */
    start(req: Request, res: Response, next: NextFunction): void {
      try {
        if (!isGoogleOAuthConfigured()) {
          res.redirect(publicFrontendUrl('/auth?error=google_not_configured'));
          return;
        }
        const state = createOAuthState();
        setOAuthStateCookie(res, state);
        res.redirect(google.getAuthorizationUrl(state));
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
        const cookieState = readCookie(req, OAUTH_STATE_COOKIE_NAME);
        clearOAuthStateCookie(res);

        if (oauthError || !code || !state) {
          res.redirect(publicFrontendUrl('/auth?error=google_denied'));
          return;
        }

        const ctx = getRequestContext(req);
        const { user, session } = await google.handleCallback(code, state, cookieState, ctx);
        const tokens = tokenService.issueAccessToken(user.id, session.id);
        setRefreshCookie(res, session.refreshToken, session.expiresAt.getTime() - Date.now());

        // Access token cannot be set as HttpOnly from another origin easily —
        // hand it via hash (preferred) and query (fallback) so the SPA can store it.
        const redirect = new URL(publicFrontendUrl('/auth/oauth/callback'));
        redirect.searchParams.set('access_token', tokens.accessToken);
        redirect.hash = `access_token=${encodeURIComponent(tokens.accessToken)}`;
        res.redirect(redirect.toString());
      } catch (err) {
        // Prefer redirect over JSON so the browser UX stays on the SPA.
        const message = err instanceof Error ? err.message : 'google_failed';
        res.redirect(
          publicFrontendUrl(
            `/auth?error=${encodeURIComponent('google_failed')}&detail=${encodeURIComponent(message)}`
          )
        );
      }
    },
  };
}
