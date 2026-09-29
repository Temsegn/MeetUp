import { Router } from 'express';
import { csrfProtection } from './security/csrf';
import { authenticate } from './middleware/authenticate.middleware';
import {
  authRateLimiter,
  loginRateLimiter,
  tokenRequestLimiter,
} from './middleware/auth-rate-limit.middleware';
import {
  validate,
  SignupSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  ChangePasswordSchema,
  UpdateProfileSchema,
  UpdateSettingsSchema,
} from './auth.validation';
import { createSignupController } from './controllers/signup.controller';
import { createLoginController } from './controllers/login.controller';
import { createLogoutController } from './controllers/logout.controller';
import { createRefreshController } from './controllers/refresh.controller';
import { createForgotPasswordController } from './controllers/forgot-password.controller';
import { createResetPasswordController } from './controllers/reset-password.controller';
import { createChangePasswordController } from './controllers/change-password.controller';
import { createVerifyEmailController } from './controllers/verify-email.controller';
import { createSessionController } from './controllers/session.controller';
import { createProfileController } from './controllers/profile.controller';
import { createGoogleAuthController } from './controllers/google-auth.controller';

const router = Router();

// ── Controllers (thin HTTP adapters over services) ─────────────────────────
const signupController = createSignupController();
const loginController = createLoginController();
const logoutController = createLogoutController();
const refreshController = createRefreshController();
const forgotPasswordController = createForgotPasswordController();
const resetPasswordController = createResetPasswordController();
const changePasswordController = createChangePasswordController();
const verifyEmailController = createVerifyEmailController();
const sessionController = createSessionController();
const profileController = createProfileController();
const googleAuthController = createGoogleAuthController();

// ── Security middleware ─────────────────────────────────────────────────────
// Origin check on every auth request (defense-in-depth behind SameSite=Lax).
router.use(csrfProtection);

// ── Public endpoints ────────────────────────────────────────────────────────

/** POST /auth/signup — create account, auto-login, send verification email. */
router.post('/signup', authRateLimiter, validate(SignupSchema), signupController.signup);

/** POST /auth/login — credentials + Remember Me. Sets HttpOnly refresh cookie. */
router.post('/login', loginRateLimiter, validate(LoginSchema), loginController.login);

// Backward-compat alias: the pre-refresh frontend called /auth/signin.
// Kept so a stale client bundle can still authenticate during rollout.
router.post('/signin', loginRateLimiter, validate(LoginSchema), loginController.login);

/** POST /auth/refresh — rotate refresh token from cookie, issue new access token. */
router.post('/refresh', authRateLimiter, refreshController.refresh);

/** POST /auth/forgot-password — generic response; emails a reset link if the account exists. */
router.post(
  '/forgot-password',
  tokenRequestLimiter,
  validate(ForgotPasswordSchema),
  forgotPasswordController.forgotPassword
);

/** POST /auth/reset-password — consume single-use token, set new password, revoke sessions. */
router.post(
  '/reset-password',
  tokenRequestLimiter,
  validate(ResetPasswordSchema),
  resetPasswordController.resetPassword
);

/** POST /auth/verify-email?token=... — consume verification token. */
router.get('/verify-email', verifyEmailController.verifyEmail);

/** GET /auth/google — start Google OAuth (sign-up + sign-in). */
router.get('/google', authRateLimiter, (req, res, next) =>
  googleAuthController.start(req, res, next)
);

/** GET /auth/google/callback — Google redirects here after consent. */
router.get('/google/callback', authRateLimiter, (req, res, next) => {
  void googleAuthController.callback(req, res, next);
});

// ── Authenticated endpoints ─────────────────────────────────────────────────

/** GET /auth/me — current user. */
router.get('/me', authenticate, sessionController.me);

/** PATCH /auth/me — update profile fields and optional avatar. */
router.patch(
  '/me',
  authRateLimiter,
  authenticate,
  validate(UpdateProfileSchema),
  profileController.updateProfile
);

/** PATCH /auth/me/settings — update preference toggles and device choices. */
router.patch(
  '/me/settings',
  authRateLimiter,
  authenticate,
  validate(UpdateSettingsSchema),
  profileController.updateSettings
);

/** POST /auth/logout — revoke the current session (cookie-based), clear cookie. */
router.post('/logout', authRateLimiter, logoutController.logout);

/** POST /auth/logout-all — revoke every session for the user. */
router.post('/logout-all', authRateLimiter, authenticate, logoutController.logoutAll);

/** POST /auth/change-password — requires current password; keeps this session. */
router.post(
  '/change-password',
  authRateLimiter,
  authenticate,
  validate(ChangePasswordSchema),
  changePasswordController.changePassword
);

/** POST /auth/resend-verification — re-issue the verification email (authenticated). */
router.post(
  '/resend-verification',
  tokenRequestLimiter,
  authenticate,
  verifyEmailController.resendVerification
);

/** POST /auth/resend-verification-email — public resend by email (login / signup). */
router.post(
  '/resend-verification-email',
  tokenRequestLimiter,
  verifyEmailController.resendVerificationByEmail
);

/** GET /auth/sessions — list the user's active sessions. */
router.get('/sessions', authenticate, sessionController.list);

/** DELETE /auth/sessions/:sessionId — revoke one session (ownership enforced). */
router.delete('/sessions/:sessionId', authenticate, sessionController.revoke);

export const authRouter = router;
