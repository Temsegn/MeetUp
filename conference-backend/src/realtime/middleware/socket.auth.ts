import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { User } from '../../models/User.model';
import { logger } from '../../infrastructure/logging/logger';
import { metrics } from '../../infrastructure/metrics/metrics.service';

/**
 * Socket.IO authentication middleware.
 *
 * Clients MUST send their JWT in the socket handshake:
 *   socket = io(URL, { auth: { token: 'Bearer eyJ...' } })
 *
 * On success: attaches socket.data.user = { userId, name, email }
 * On failure: calls next(new Error(...)) — connection is rejected
 */
export async function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void,
): Promise<void> {
  try {
    const raw: unknown = socket.handshake.auth?.token;

    if (typeof raw !== 'string' || !raw) {
      metrics.authFailures.inc();
      return next(new Error('AUTH_REQUIRED: No token provided'));
    }

    const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;

    let decoded: { userId: string };
    try {
      decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
    } catch {
      metrics.authFailures.inc();
      return next(new Error('AUTH_INVALID: Invalid or expired token'));
    }

    const user = await User.findById(decoded.userId).select('name email').lean();
    if (!user) {
      metrics.authFailures.inc();
      return next(new Error('AUTH_INVALID: User not found'));
    }

    socket.data.user = {
      userId: decoded.userId,
      name:   user.name,
      email:  user.email,
    };

    logger.debug('Socket authenticated', {
      socketId: socket.id,
      userId: decoded.userId,
    });

    next();
  } catch (err) {
    metrics.authFailures.inc();
    logger.error('Socket auth middleware error', { err });
    next(new Error('AUTH_ERROR: Internal authentication error'));
  }
}
