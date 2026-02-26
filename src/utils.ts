/**
 * Utility functions and constants for NodeCrypt.
 */

/** Prefix for encrypted values */
export const ENC_PREFIX = 'ENC(';

/** Suffix for encrypted values */
export const ENC_SUFFIX = ')';

/** Regex pattern to match ENC(...) values */
export const ENC_PATTERN = /ENC\(([^)]+)\)/g;

/**
 * Check if a value is in ENC(...) format.
 *
 * @param value - The value to check
 * @returns True if value is in ENC(...) format
 *
 * @example
 * ```typescript
 * isEncrypted('ENC(abc123)'); // true
 * isEncrypted('plaintext');   // false
 * ```
 */
export function isEncrypted(value: string | null | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  return trimmed.startsWith(ENC_PREFIX) && trimmed.endsWith(ENC_SUFFIX);
}
