import crypto from 'crypto';

/**
 * One-way hash for tokens stored at rest.
 *
 * Refresh / reset / verification tokens are high-entropy (256-bit) random
 * values, so a fast hash (SHA-256) is appropriate — brute-forcing 256 bits
 * is infeasible, and unlike passwords there is no human-chosen value to
 * protect from a dictionary attack. Hashing at rest means a database leak
 * exposes no usable tokens.
 *
 * The hash is used as the lookup key, so it must be deterministic.
 */

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Constant-time equality for hash comparison (defense in depth). */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
