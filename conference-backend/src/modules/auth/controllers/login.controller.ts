import { Request, Response } from 'express';
import { AuthDeps, authRepository } from '../auth.repository';
import { createLoginService } from '../services/login.service';
import { tokenService } from '../services/token.service';
import { toSafeUser, getRequestContext } from '../auth.types';
import { setRefreshCookie } from '../security/cookie-config';
import { LoginInput } from '../auth.validation';

export function createLoginController(deps: AuthDeps = authRepository) {
  const loginService = createLoginService(deps);

  return {
    /** POST /auth/login */
    async login(req: Request, res: Response): Promise<void> {
      const body = res.locals.body as LoginInput;
      const ctx = getRequestContext(req);
      const { user, session } = await loginService.login({ ...body, ctx });

      const tokens = tokenService.issueAccessToken(user.id, session.id);
      setRefreshCookie(res, session.refreshToken, session.expiresAt.getTime() - Date.now());

      res.json({ user: toSafeUser(user), tokens });
    },
  };
}
