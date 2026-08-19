import crypto from 'crypto';

/**
 * Cryptographically secure random token generation.
 *
 * All tokens (refresh tokens, reset tokens, verification tokens) are opaque
 * high-entropy strings generated from the CSPRNG — never guessable, never
 * derived from user input. Base64url keeps them URL-safe.
 */

const BYTES = 32; // 256 bits of entropy

/** Opaque high-entropy token (256 bits, base64url). */
export function generateSecureToken(bytes: number = BYTES): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

/** Raw entropy, hex-encoded (used for family ids / internal ids). */
export function generateHexId(bytes: number = 16): string {
  return crypto.randomBytes(bytes).toString('hex');
}
