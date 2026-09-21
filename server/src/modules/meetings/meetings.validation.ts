import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { ValidationError } from '../../shared/errors/AppError';

export { ListMeetingsQuerySchema, type ListMeetingsQueryInput } from './validators/list-meetings.validator';
export { CreateMeetingSchema, type CreateMeetingBody } from './validators/create-meeting.validator';
export { MeetingIdParamsSchema, type MeetingIdParams } from './validators/meeting-id.validator';

function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.flatten().fieldErrors;
    throw new ValidationError('Validation failed.', 'VALIDATION_ERROR', details);
  }
  return result.data;
}

export function validateBody<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    res.locals.body = parse(schema, req.body);
    next();
  };
}

export function validateQuery<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    res.locals.query = parse(schema, req.query);
    next();
  };
}

export function validateParams<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    res.locals.params = parse(schema, req.params);
    next();
  };
}
