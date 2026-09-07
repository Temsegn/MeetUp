/** True when the message body is only emoji (and optional whitespace). */
export function isEmojiOnlyMessage(text: string): boolean {
  const t = text.trim();
  if (!t || t.length > 32) return false;
  try {
    const stripped = t
      .replace(/\p{Extended_Pictographic}/gu, '')
      .replace(/[\uFE0F\u200D\u20E3\uFE0E]/g, '')
      .replace(/\s/g, '');
    return stripped.length === 0 && /\p{Extended_Pictographic}/u.test(t);
  } catch {
    // Fallback without Unicode property escapes
    return /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\s)+$/u.test(t);
  }
}
