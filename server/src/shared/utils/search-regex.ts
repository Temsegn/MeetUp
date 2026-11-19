/**
 * Build a safe case-insensitive "contains" matcher from user search text.
 * Escapes regex metacharacters (so `(a+)+$` can't trigger catastrophic
 * backtracking / ReDoS in Mongo) and caps the length.
 */
export function containsRegex(input: unknown, maxLength = 100): { $regex: string; $options: 'i' } | null {
  const text = String(input ?? '').trim().slice(0, maxLength);
  if (!text) return null;
  return { $regex: text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
}
