import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.email('A valid email address is required.'),
  password: z.string().min(1, 'Password is required.').max(256),
  rememberMe: z.boolean().optional().default(false),
});

export type LoginInput = z.infer<typeof LoginSchema>;
