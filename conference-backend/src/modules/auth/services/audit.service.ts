import { AuthDeps, authRepository, AuditEntry } from '../auth.repository';
import { logger } from '../../../infrastructure/logging/logger';

/**
 * Audit logging for auth events.
 *
 * Every security-relevant event is persisted (fire-and-forget) through the
 * repository's `audit` and mirrored to the structured application log for
 * operational visibility. Events never contain secrets.
 */

const SENSITIVE_ACTIONS = new Set([
  'LOGIN_FAILED',
  'LOGIN_LOCKED',
  'REFRESH_REUSE_DETECTED',
  'PASSWORD_RESET_TOKEN_INVALID',
  'ACCESS_DENIED',
  'EMAIL_VERIFICATION_INVALID',
]);

export function createAuditService(deps: AuthDeps = authRepository) {
  return {
    record(entry: AuditEntry): void {
      deps.audit(entry);
      if (SENSITIVE_ACTIONS.has(entry.action)) {
        logger.warn(`Audit: ${entry.action}`, {
          userId: entry.userId,
          email: entry.email,
          ip: entry.ip,
        });
      }
    },
  };
}
