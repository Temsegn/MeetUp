import { z } from 'zod';
import { PASSWORD_POLICY } from '../auth.constants';

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.').max(256),
    newPassword: z
      .string()
      .min(PASSWORD_POLICY.minLength, `Password must be at least ${PASSWORD_POLICY.minLength} characters.`)
      .max(PASSWORD_POLICY.maxLength, `Password must be at most ${PASSWORD_POLICY.maxLength} characters.`)
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
      .regex(/[0-9]/, 'Password must contain at least one number.'),
    confirmPassword: z.string().min(1, 'Please confirm your new password.'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
