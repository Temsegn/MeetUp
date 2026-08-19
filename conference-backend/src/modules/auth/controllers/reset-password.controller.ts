import { Request, Response } from 'express';
import { AuthDeps, authRepository } from '../auth.repository';
import { createPasswordResetService } from '../services/password-reset.service';
import { getRequestContext } from '../auth.types';
import { ResetPasswordInput } from '../auth.validation';

export function createResetPasswordController(deps: AuthDeps = authRepository) {
  const resetService = createPasswordResetService(deps);

  return {
    /** POST /auth/reset-password — consume token, set new password, revoke sessions. */
    async resetPassword(req: Request, res: Response): Promise<void> {
      const body = res.locals.body as ResetPasswordInput;
      await resetService.resetPassword({
        token: body.token,
        newPassword: body.newPassword,
        ctx: getRequestContext(req),
      });
      res.json({ success: true });
    },
  };
}
