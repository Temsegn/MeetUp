import { Response } from 'express';
import { AuthDeps, authRepository } from '../auth.repository';
import { createEmailVerificationService } from '../services/email-verification.service';
import { AuthRequest, getRequestContext, toSafeUser } from '../auth.types';

export function createVerifyEmailController(deps: AuthDeps = authRepository) {
  const verificationService = createEmailVerificationService(deps);

  return {
    /** GET /auth/verify-email?token=... */
    async verifyEmail(req: AuthRequest, res: Response): Promise<void> {
      const token = typeof req.query.token === 'string' ? req.query.token : '';
      if (!token) {
        res.status(400).json({ error: 'Verification token is required.', code: 'TOKEN_REQUIRED' });
        return;
      }
      const { user } = await verificationService.verify({
        token,
        ctx: getRequestContext(req),
      });
      res.json({ success: true, user: toSafeUser(user) });
    },

    /** POST /auth/resend-verification — requires authentication. */
    async resendVerification(req: AuthRequest, res: Response): Promise<void> {
      const result = await verificationService.sendVerification({
        user: req.user!,
        ctx: getRequestContext(req),
      });
      if (result.alreadyVerified) {
        res.json({ success: true, alreadyVerified: true });
        return;
      }
      res.json({ success: true, message: 'Verification email sent.' });
    },
  };
}
