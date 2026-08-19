import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { ValidationError } from '../../shared/errors/AppError';

/**
 * Barrel + shared validation middleware for the auth module.
 * Per-endpoint schemas live in validators/*.
 */

export { SignupSchema, type SignupInput } from './validators/signup.validator';
export { LoginSchema, type LoginInput } from './validators/login.validator';
export { ForgotPasswordSchema, type ForgotPasswordInput } from './validators/forgot-password.validator';
export {
  ResetPasswordSchema,
  type ResetPasswordInput,
} from './validators/reset-password.validator';
export {
  ChangePasswordSchema,
  type ChangePasswordInput,
} from './validators/change-password.validator';
export { RefreshTokenSchema, type RefreshTokenInput } from './validators/refresh-token.validator';

/** Validate `req.body` (or any value) against a zod schema; throw on failure. */
export function parseBody<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.flatten().fieldErrors;
    throw new ValidationError('Validation failed.', 'VALIDATION_ERROR', details);
  }
  return result.data;
}

/** Express middleware: validate req.body, attach parsed values to res.locals. */
export function validate<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const data = parseBody(schema, req.body);
    res.locals.body = data;
    next();
  };
}
