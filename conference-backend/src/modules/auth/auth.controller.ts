/**
 * Barrel for the auth module's controllers. Controllers stay thin: they
 * validate (via middleware), call a service, and shape the HTTP response.
 */
export { createSignupController } from './controllers/signup.controller';
export { createLoginController } from './controllers/login.controller';
export { createLogoutController } from './controllers/logout.controller';
export { createRefreshController } from './controllers/refresh.controller';
export { createForgotPasswordController } from './controllers/forgot-password.controller';
export { createResetPasswordController } from './controllers/reset-password.controller';
export { createChangePasswordController } from './controllers/change-password.controller';
export { createVerifyEmailController } from './controllers/verify-email.controller';
export { createSessionController } from './controllers/session.controller';
