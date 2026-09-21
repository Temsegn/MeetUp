import { Request, Response } from 'express';
import { AuthDeps, authRepository } from '../auth.repository';
import { createSignupService } from '../services/signup.service';
import { tokenService } from '../services/token.service';
import { toSafeUser, getRequestContext } from '../auth.types';
import { setRefreshCookie } from '../security/cookie-config';
import { SignupInput } from '../auth.validation';

export function createSignupController(deps: AuthDeps = authRepository) {
  const signupService = createSignupService(deps);

  return {
    /** POST /auth/signup */
    async signup(req: Request, res: Response): Promise<void> {
      const body = res.locals.body as SignupInput;
      const ctx = getRequestContext(req);
      const { user, session } = await signupService.signup({ ...body, ctx });

      const tokens = tokenService.issueAccessToken(user.id, session.id);
      setRefreshCookie(res, session.refreshToken, session.expiresAt.getTime() - Date.now());

      res.status(201).json({ user: toSafeUser(user), tokens });
    },
  };
}
