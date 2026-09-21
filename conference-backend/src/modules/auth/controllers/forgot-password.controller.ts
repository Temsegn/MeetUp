import { Request, Response } from 'express';
import { AuthDeps, authRepository } from '../auth.repository';
import { createPasswordResetService } from '../services/password-reset.service';
import { getRequestContext } from '../auth.types';
import { ForgotPasswordInput } from '../auth.validation';

export function createForgotPasswordController(deps: AuthDeps = authRepository) {
  const resetService = createPasswordResetService(deps);

  return {
    /**
     * POST /auth/forgot-password
     * Always returns the same generic success — no account-enumeration oracle.
     */
    async forgotPassword(req: Request, res: Response): Promise<void> {
      const body = res.locals.body as ForgotPasswordInput;
      await resetService.requestReset({ email: body.email, ctx: getRequestContext(req) });
      res.json({
        message:
          'If an account exists for that email, a password reset link has been sent.',
      });
    },
  };
}
