/**
 * Core encryption module using AES-256-GCM.
 *
 * This is the recommended encryptor for new projects as it provides
 * authenticated encryption with associated data (AEAD).
 */

import * as crypto from 'crypto';
import { ENC_PREFIX, ENC_SUFFIX, ENC_PATTERN, isEncrypted } from './utils';

export interface EncryptorOptions {
  /** PBKDF2 iteration count (default: 10000) */
  iterations?: number;
  /** Salt size in bytes (default: 16) */
  saltSize?: number;
  /** Key size in bytes (default: 32 for AES-256) */
  keySize?: number;
}

/**
 * AES-256-GCM Encryptor - Recommended for new projects.
 *
 * This encryptor uses AES-256-GCM which provides authenticated encryption,
 * meaning it can detect if the ciphertext has been tampered with.
 *
 * @example
 * ```typescript
 * const enc = new Encryptor('myPassword');
 * const encrypted = enc.encryptWithPrefix('secret');
 * const decrypted = enc.decryptPrefixed(encrypted);
 * ```
 *
 * Note: This encryptor is NOT compatible with Java Jasypt.
 * For Jasypt compatibility, use JasyptEncryptor.
 */
export class Encryptor {
  private password: Buffer;
  private iterations: number;
  private saltSize: number;
  private keySize: number;

  /**
   * Create a new Encryptor.
   *
   * @param password - The encryption password
   * @param options - Optional configuration
   * @throws Error if password is empty
   */
  constructor(password: string, options: EncryptorOptions = {}) {
    if (!password) {
      throw new Error('Password cannot be empty');
    }

    this.password = Buffer.from(password, 'utf-8');
    this.iterations = options.iterations ?? 10000;
    this.saltSize = options.saltSize ?? 16;
    this.keySize = options.keySize ?? 32;
  }

  /**
   * Derive key from password using PBKDF2-HMAC-SHA256.
   */
  private deriveKey(salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(
      this.password,
      salt,
      this.iterations,
      this.keySize,
      'sha256'
    );
  }

  /**
   * Encrypt plaintext and return base64-encoded ciphertext.
   *
   * @param plaintext - The text to encrypt
   * @returns Base64-encoded ciphertext
   * @throws Error if plaintext is empty
   */
  encrypt(plaintext: string): string {
    if (!plaintext) {
      throw new Error('Plaintext cannot be empty');
    }

    // Generate random salt and IV
    const salt = crypto.randomBytes(this.saltSize);
    const iv = crypto.randomBytes(12); // GCM standard IV size

    // Derive key
    const key = this.deriveKey(salt);

    // Create cipher and encrypt
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf-8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    // Combine: salt + iv + ciphertext + tag
    const combined = Buffer.concat([salt, iv, encrypted, tag]);

    return combined.toString('base64');
  }

  /**
   * Encrypt and wrap with ENC(...) prefix.
   *
   * @param plaintext - The text to encrypt
   * @returns Encrypted value in format: ENC(base64...)
   */
  encryptWithPrefix(plaintext: string): string {
    const encrypted = this.encrypt(plaintext);
    return `${ENC_PREFIX}${encrypted}${ENC_SUFFIX}`;
  }

  /**
   * Decrypt base64-encoded ciphertext.
   *
   * @param encoded - Base64-encoded ciphertext
   * @returns Decrypted plaintext
   * @throws Error if decryption fails
   */
  decrypt(encoded: string): string {
    if (!encoded) {
      throw new Error('Encoded value cannot be empty');
    }

    try {
      const combined = Buffer.from(encoded, 'base64');

      // Extract components
      const salt = combined.subarray(0, this.saltSize);
      const iv = combined.subarray(this.saltSize, this.saltSize + 12);
      const tag = combined.subarray(combined.length - 16);
      const ciphertext = combined.subarray(this.saltSize + 12, combined.length - 16);

      // Derive key
      const key = this.deriveKey(salt);

      // Decrypt
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);

      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);

      return decrypted.toString('utf-8');
    } catch (error) {
      throw new Error(`Decryption failed: ${error}`);
    }
  }

  /**
   * Decrypt a value with ENC(...) prefix.
   *
   * @param value - Encrypted value in format ENC(base64...)
   * @returns Decrypted plaintext
   * @throws Error if format is invalid or decryption fails
   */
  decryptPrefixed(value: string): string {
    const trimmed = value.trim();

    if (!trimmed.startsWith(ENC_PREFIX) || !trimmed.endsWith(ENC_SUFFIX)) {
      throw new Error(`Invalid encrypted format, expected ${ENC_PREFIX}...${ENC_SUFFIX}`);
    }

    const encrypted = trimmed.slice(ENC_PREFIX.length, -ENC_SUFFIX.length);
    return this.decrypt(encrypted);
  }

  /**
   * Decrypt all ENC(...) values in a string.
   *
   * @param input - String containing ENC(...) values
   * @returns String with all ENC(...) values decrypted
   */
  decryptAllInString(input: string): string {
    return input.replace(ENC_PATTERN, (match) => {
      try {
        return this.decryptPrefixed(match);
      } catch {
        return match; // Keep original on error
      }
    });
  }

  /**
   * Decrypt all ENC(...) values in an object.
   *
   * @param config - Object with potentially encrypted values
   * @returns Object with all ENC(...) values decrypted
   */
  decryptMap(config: Record<string, string>): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(config)) {
      if (isEncrypted(value)) {
        try {
          result[key] = this.decryptPrefixed(value);
        } catch {
          result[key] = value; // Keep original on error
        }
      } else {
        result[key] = value;
      }
    }

    return result;
  }
}
