import bcrypt from 'bcrypt';
import { BCRYPT_ROUNDS } from '../auth.constants';

/**
 * Password hashing (bcrypt).
 *
 * bcrypt was chosen over scrypt/argon2 for portability: it is the
 * long-standing default for Node backends, is already a project dependency,
 * and ships prebuilt binaries. The work factor (cost 12) is env-driven.
 */

export const hashPassword = (password: string): Promise<string> =>
  bcrypt.hash(password, BCRYPT_ROUNDS);

/**
 * Constant-time-ish comparison of a password against a stored hash.
 * bcrypt.compare performs its own constant-time comparison of the derived
 * keys, so timing does not leak the password length or content.
 */
export const verifyPassword = (password: string, hash: string): Promise<boolean> =>
  bcrypt.compare(password, hash);

/** True if a password is identical to the current hash (prevents reuse). */
export const isSamePassword = (password: string, hash: string): Promise<boolean> =>
  bcrypt.compare(password, hash);
