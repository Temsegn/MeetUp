import { z } from 'zod';
import { PASSWORD_POLICY } from '../auth.constants';

export const SignupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required.')
    .max(100, 'Name must be at most 100 characters.'),
  email: z.email('A valid email address is required.'),
  password: z
    .string()
    .min(PASSWORD_POLICY.minLength, `Password must be at least ${PASSWORD_POLICY.minLength} characters.`)
    .max(PASSWORD_POLICY.maxLength, `Password must be at most ${PASSWORD_POLICY.maxLength} characters.`)
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
    .regex(/[0-9]/, 'Password must contain at least one number.'),
  rememberMe: z.boolean().optional().default(false),
});

export type SignupInput = z.infer<typeof SignupSchema>;
