import { Response } from 'express';
import { NotFoundError } from '../../../shared/errors/AppError';
import { AuthDeps, authRepository } from '../auth.repository';
import { createSessionService } from '../services/session.service';
import {
  AuthRequest,
  SessionInfo,
  SessionRecord,
  toSafeUser,
} from '../auth.types';

/**
 * Session management endpoints: current user, session list, revocation.
 */
export function createSessionController(deps: AuthDeps = authRepository) {
  const sessions = createSessionService(deps);

  const toSessionInfo = (s: SessionRecord, currentId: string | undefined): SessionInfo => ({
    id: s.id,
    current: s.id === currentId,
    rememberMe: s.rememberMe,
    userAgent: s.userAgent ?? 'Unknown device',
    ip: s.ip ?? 'Unknown IP',
    createdAt: s.createdAt.toISOString(),
    lastUsedAt: s.lastUsedAt.toISOString(),
    expiresAt: s.expiresAt.toISOString(),
  });

  return {
    /** GET /auth/me */
    async me(req: AuthRequest, res: Response): Promise<void> {
      res.json(toSafeUser(req.user!));
    },

    /** GET /auth/sessions */
    async list(req: AuthRequest, res: Response): Promise<void> {
      const userId = req.user!.id;
      const records = await sessions.listUserSessions(userId);
      res.json({
        sessions: records.map((s) => toSessionInfo(s, req.sessionId)),
        currentSessionId: req.sessionId ?? null,
      });
    },

    /** DELETE /auth/sessions/:sessionId */
    async revoke(req: AuthRequest, res: Response): Promise<void> {
      const userId = req.user!.id;
      const raw = req.params['sessionId'];
      const sessionId = Array.isArray(raw) ? raw[0] : (raw ?? '');

      // Ownership-scoped lookup — users can only revoke their own sessions.
      const target = await deps.findSessionByIdForUser(sessionId, userId);
      if (!target) {
        throw new NotFoundError('Session', 'SESSION_NOT_FOUND');
      }

      await sessions.revokeSession(target.id, 'user_revoked');
      res.json({ success: true });
    },
  };
}
