import { Response } from 'express';
import { AuthDeps, authRepository } from '../auth.repository';
import { normalizeEmail } from '../auth.constants';
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

    /**
     * POST /auth/resend-verification-email — public (email only).
     * Always returns success to avoid account enumeration.
     */
    async resendVerificationByEmail(req: AuthRequest, res: Response): Promise<void> {
      const raw =
        typeof (req.body as { email?: string })?.email === 'string'
          ? (req.body as { email: string }).email
          : '';
      const email = raw ? normalizeEmail(raw) : '';
      if (email) {
        const user = await deps.findUserByEmail(email);
        if (user && !user.emailVerifiedAt) {
          await verificationService.sendVerification({
            user,
            ctx: getRequestContext(req),
          });
        }
      }
      res.json({
        success: true,
        message: 'If an unverified account exists for that email, a verification link was sent.',
      });
    },
  };
}
