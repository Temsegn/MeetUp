import { z } from 'zod';

export const ForgotPasswordSchema = z.object({
  email: z.email('A valid email address is required.'),
});

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
