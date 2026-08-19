/**
 * Typed application error hierarchy.
 * All errors carry a machine-readable code and an HTTP status.
 */
export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class AuthError extends AppError {
  constructor(message = 'Authentication required', code = 'AUTH_ERROR', details?: unknown) {
    super(message, code, 401, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied', details?: unknown) {
    super(message, 'FORBIDDEN', 403, details);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', code = 'VALIDATION_ERROR', details?: unknown) {
    super(message, code, 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, details?: unknown) {
    super(`${resource} not found`, 'NOT_FOUND', 404, details);
  }
}

export class MediaError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'MEDIA_ERROR', 500, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONFLICT', 409, details);
  }
}

/** Type guard */
export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
