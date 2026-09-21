import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { ValidationError } from '../../shared/errors/AppError';

export { RoomIdParamsSchema, type RoomIdParams } from './validators/room-id.validator';

function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.flatten().fieldErrors;
    throw new ValidationError('Validation failed.', 'VALIDATION_ERROR', details);
  }
  return result.data;
}

export function validateParams<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    res.locals.params = parse(schema, req.params);
    next();
  };
}
