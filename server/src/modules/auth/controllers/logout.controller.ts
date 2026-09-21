import { Response } from 'express';
import { AuthDeps, authRepository } from '../auth.repository';
import { createLogoutService } from '../services/logout.service';
import { AuthRequest, getRequestContext } from '../auth.types';
import {
  REFRESH_COOKIE_NAME,
  readCookie,
  clearRefreshCookie,
} from '../security/cookie-config';

export function createLogoutController(deps: AuthDeps = authRepository) {
  const logoutService = createLogoutService(deps);

  return {
    /** POST /auth/logout — revoke the current session and clear the cookie. */
    async logout(req: AuthRequest, res: Response): Promise<void> {
      const ctx = getRequestContext(req);
      await logoutService.logout({
        refreshToken: readCookie(req, REFRESH_COOKIE_NAME),
        ctx,
      });
      clearRefreshCookie(res);
      res.json({ success: true });
    },

    /** POST /auth/logout-all — revoke every session (including current). */
    async logoutAll(req: AuthRequest, res: Response): Promise<void> {
      const ctx = getRequestContext(req);
      const userId = req.user!.id;
      await logoutService.logoutAll({ userId, ctx });
      clearRefreshCookie(res);
      res.json({ success: true });
    },
  };
}
