import { z } from 'zod';

/**
 * Refresh requests carry the token in an HttpOnly cookie, never in the body
 * or URL. This schema validates the cookie VALUE so a missing or malformed
 * cookie fails fast with a clear validation error instead of a DB lookup.
 */
export const RefreshTokenSchema = z
  .string()
  .min(1, 'Refresh token is required.')
  .max(512, 'Refresh token is malformed.');

export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
