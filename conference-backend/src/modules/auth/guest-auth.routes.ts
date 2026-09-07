import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { env } from '../../config/env';
import { Meeting } from '../../database/models/Meeting.model';
import { isMeetingJoinable } from '../meetings/services/meetings-workspace.service';
import {
  assertCanAccessMeeting,
  requireGuestEmail,
} from '../meetings/services/meeting-join-authz.service';
import { isAppError } from '../../shared/errors/AppError';
import { authRateLimiter } from './middleware/auth-rate-limit.middleware';
import { csrfProtection } from './security/csrf';

const GuestSchema = z.object({
  name: z.string().trim().min(1).max(80),
  roomId: z.string().trim().min(1).max(128),
  email: z.string().trim().email().max(200),
});

/**
 * Guest meeting access — name + invited email, no account.
 * Issues a short-lived JWT scoped to joining a specific room.
 */
export function createGuestAuthRouter(): Router {
  const router = Router();
  router.use(csrfProtection);

  router.post('/guest', authRateLimiter, async (req, res) => {
    const parsed = GuestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Name, invitation email, and roomId are required',
        code: 'VALIDATION_ERROR',
      });
    }
    const { name, roomId } = parsed.data;
    let email: string;
    try {
      email = requireGuestEmail(parsed.data.email);
    } catch (err) {
      if (isAppError(err)) {
        return res.status(err.statusCode).json({ error: err.message, code: err.code });
      }
      return res.status(400).json({ error: 'Invalid invitation email' });
    }

    const meeting = await Meeting.findOne({ roomId }).lean();
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    if (meeting.status === 'cancelled' || meeting.status === 'ended') {
      return res.status(403).json({ error: 'Meeting is not available' });
    }
    if (!isMeetingJoinable(meeting)) {
      return res.status(403).json({ error: 'Meeting has not started yet' });
    }

    try {
      await assertCanAccessMeeting({
        meeting,
        joinerUserId: `guest_pending`,
        isGuest: true,
        guestEmail: email,
      });
    } catch (err) {
      if (isAppError(err)) {
        return res.status(err.statusCode).json({ error: err.message, code: err.code });
      }
      throw err;
    }

    const guestId = `guest_${randomUUID()}`;
    const expiresIn = 60 * 60 * 4; // 4 hours
    const accessToken = jwt.sign(
      {
        userId: guestId,
        name,
        email,
        guest: true,
        roomId,
        iatMs: Date.now(),
      },
      env.JWT_SECRET,
      { expiresIn },
    );

    return res.json({
      user: {
        id: guestId,
        name,
        email,
        avatarColor: '#64748B',
        avatarUrl: null,
        jobTitle: '',
        department: '',
        settings: {},
        authProvider: 'guest',
        emailVerified: false,
        createdAt: new Date().toISOString(),
        isGuest: true,
      },
      tokens: { accessToken, expiresIn },
    });
  });

  return router;
}
