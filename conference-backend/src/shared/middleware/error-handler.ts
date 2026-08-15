import { Request, Response, NextFunction } from 'express';
import { logger } from '../../infrastructure/logging/logger';
import { isAppError } from '../errors/AppError';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (isAppError(err)) {
    logger.warn('Application error', { code: err.code, message: err.message });
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }
  logger.error('Unhandled server error', { err });
  res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
}
