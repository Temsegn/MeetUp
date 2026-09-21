/**
 * Barrel for the auth module's services. Services are created as factories
 * over the AuthDeps interface (see auth.repository.ts) so tests can inject
 * in-memory stubs.
 */
export { createSignupService } from './services/signup.service';
export { createLoginService } from './services/login.service';
export { createLogoutService } from './services/logout.service';
export { createSessionService } from './services/session.service';
export { tokenService } from './services/token.service';
export { createPasswordService, assertPasswordStrength } from './services/password.service';
export { createPasswordResetService } from './services/password-reset.service';
export { createEmailVerificationService } from './services/email-verification.service';
export { emailService } from './services/email.service';
export { createAuditService } from './services/audit.service';
