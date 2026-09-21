import { Response } from 'express';
import { AuthDeps, authRepository } from '../auth.repository';
import { createPasswordService } from '../services/password.service';
import { AuthRequest, getRequestContext } from '../auth.types';
import { ChangePasswordInput } from '../auth.validation';

export function createChangePasswordController(deps: AuthDeps = authRepository) {
  const passwordService = createPasswordService(deps);

  return {
    /**
     * POST /auth/change-password
     * Requires authentication. Revokes all OTHER sessions; the current
     * session stays valid and receives a fresh access token (its `iat` is
     * post-change, so it survives the passwordChangedAt check).
     */
    async changePassword(req: AuthRequest, res: Response): Promise<void> {
      const body = res.locals.body as ChangePasswordInput;
      const tokens = await passwordService.changePassword({
        userId: req.user!.id,
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
        keepSessionId: req.sessionId,
        ctx: getRequestContext(req),
      });
      res.json({ success: true, tokens });
    },
  };
}
