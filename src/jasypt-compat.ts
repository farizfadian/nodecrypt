/**
 * Jasypt-style encryption module.
 *
 * - `JasyptEncryptor` (PBEWithMD5AndDES) is byte-compatible with Java Jasypt in both directions.
 * - `JasyptStrongEncryptor` uses the layout shared by GoCrypt/PyCrypt/PHPCrypt/RustCrypt,
 *   which is NOT the layout Java Jasypt uses for PBEWITHHMACSHA256ANDAES_256.
 */

import * as crypto from 'crypto';
import { ENC_PREFIX, ENC_SUFFIX, ENC_PATTERN, isEncrypted } from './utils';

/** Error code Node.js reports when OpenSSL 3 refuses a legacy cipher such as DES. */
const OPENSSL_UNSUPPORTED = 'ERR_OSSL_EVP_UNSUPPORTED';

function isLegacyProviderError(error: unknown): boolean {
  return (error as { code?: unknown } | null)?.code === OPENSSL_UNSUPPORTED;
}

/**
 * Run a DES cipher factory. OpenSSL 3 (Node.js 17+) disables DES unless Node.js starts with
 * --openssl-legacy-provider, and its own error ("digital envelope routines::unsupported")
 * does not say so. Rethrow with the fix in the message, keeping the original error code.
 */
function withLegacyProviderHint<T>(create: () => T): T {
  try {
    return create();
  } catch (error) {
    if (!isLegacyProviderError(error)) {
      throw error;
    }
    const hint = new Error(
      'PBEWithMD5AndDES needs DES, which OpenSSL 3 disables by default in Node.js 17+. ' +
        'Start Node.js with --openssl-legacy-provider, or set NODE_OPTIONS=--openssl-legacy-provider. ' +
        `(OpenSSL: ${(error as Error).message})`
    ) as NodeJS.ErrnoException;
    hint.code = OPENSSL_UNSUPPORTED;
    throw hint;
  }
}

export interface JasyptEncryptorOptions {
  /** Key derivation iteration count (default: 1000) */
  iterations?: number;
}

/**
 * Jasypt-compatible encryptor using PBEWithMD5AndDES.
 *
 * This encryptor is compatible with Java Jasypt's default algorithm.
 * Use this when you need to decrypt values encrypted by Java Jasypt
 * or when Go/Java/Python applications need to read the same encrypted config.
 *
 * WARNING: This algorithm is considered weak by modern standards.
 * Use only for backward compatibility with existing Jasypt-encrypted values.
 *
 * @example
 * ```typescript
 * const enc = new JasyptEncryptor('myPassword');
 *
 * // Decrypt value from Java
 * const decrypted = enc.decryptPrefixed('ENC(fromJava)');
 *
 * // Encrypt for Java/Go/Python compatibility
 * const encrypted = enc.encryptWithPrefix('secret');
 * ```
 */
export class JasyptEncryptor {
  private password: string;
  private iterations: number;
  private readonly SALT_SIZE = 8; // DES uses 8-byte salt

  /**
   * Create a new JasyptEncryptor.
   *
   * @param password - The encryption password
   * @param options - Optional configuration
   * @throws Error if password is empty
   */
  constructor(password: string, options: JasyptEncryptorOptions = {}) {
    if (!password) {
      throw new Error('Password cannot be empty');
    }

    this.password = password;
    this.iterations = options.iterations ?? 1000;
  }

  /**
   * Derive key and IV using PBKDF1 with MD5 (Jasypt's method).
   * This implements the OpenSSL EVP_BytesToKey function used by Jasypt.
   */
  private deriveKeyAndIv(salt: Buffer): { key: Buffer; iv: Buffer } {
    const data = Buffer.concat([Buffer.from(this.password, 'utf-8'), salt]);

    // First iteration
    let result = crypto.createHash('md5').update(data).digest();

    // Additional iterations
    for (let i = 1; i < this.iterations; i++) {
      result = crypto.createHash('md5').update(result).digest();
    }

    // MD5 produces 16 bytes, split into key (8) and IV (8)
    return {
      key: result.subarray(0, 8),
      iv: result.subarray(8, 16),
    };
  }

  /**
   * Encrypt plaintext using PBEWithMD5AndDES (Jasypt compatible).
   *
   * @param plaintext - The text to encrypt
   * @returns Base64-encoded ciphertext
   */
  encrypt(plaintext: string): string {
    if (!plaintext) {
      throw new Error('Plaintext cannot be empty');
    }

    // Generate random salt
    const salt = crypto.randomBytes(this.SALT_SIZE);

    // Derive key and IV
    const { key, iv } = this.deriveKeyAndIv(salt);

    // Create DES cipher in CBC mode
    const cipher = withLegacyProviderHint(() => crypto.createCipheriv('des-cbc', key, iv));

    // Encrypt with PKCS5 padding (Node.js does this automatically)
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf-8'),
      cipher.final(),
    ]);

    // Combine salt + ciphertext (Jasypt format)
    const combined = Buffer.concat([salt, encrypted]);

    return combined.toString('base64');
  }

  /**
   * Encrypt and wrap with ENC(...) prefix.
   */
  encryptWithPrefix(plaintext: string): string {
    const encrypted = this.encrypt(plaintext);
    return `${ENC_PREFIX}${encrypted}${ENC_SUFFIX}`;
  }

  /**
   * Decrypt Jasypt-encrypted data.
   *
   * @param encoded - Base64-encoded ciphertext
   * @returns Decrypted plaintext
   */
  decrypt(encoded: string): string {
    if (!encoded) {
      throw new Error('Encoded value cannot be empty');
    }

    try {
      const combined = Buffer.from(encoded, 'base64');

      // Minimum size: 8 (salt) + 8 (at least one block)
      if (combined.length < 16) {
        throw new Error('Invalid Jasypt data');
      }

      // Extract salt and ciphertext
      const salt = combined.subarray(0, this.SALT_SIZE);
      const ciphertext = combined.subarray(this.SALT_SIZE);

      // Ciphertext must be multiple of block size (8 for DES)
      if (ciphertext.length % 8 !== 0) {
        throw new Error('Invalid Jasypt data');
      }

      // Derive key and IV
      const { key, iv } = this.deriveKeyAndIv(salt);

      // Decrypt
      const decipher = withLegacyProviderHint(() => crypto.createDecipheriv('des-cbc', key, iv));
      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);

      return decrypted.toString('utf-8');
    } catch (error) {
      if (isLegacyProviderError(error)) {
        throw error;
      }
      throw new Error(`Decryption failed: ${error}`);
    }
  }

  /**
   * Decrypt a value with ENC(...) prefix.
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
   * Values that cannot be decrypted are left unchanged, except when DES itself is
   * unavailable (missing --openssl-legacy-provider): that error is thrown, because
   * no value could be decrypted.
   */
  decryptAllInString(input: string): string {
    return input.replace(ENC_PATTERN, (match) => {
      try {
        return this.decryptPrefixed(match);
      } catch (error) {
        if (isLegacyProviderError(error)) {
          throw error;
        }
        return match;
      }
    });
  }

  /**
   * Decrypt all ENC(...) values in an object.
   *
   * Values that cannot be decrypted are left unchanged, except when DES itself is
   * unavailable (missing --openssl-legacy-provider): that error is thrown, because
   * no value could be decrypted.
   */
  decryptMap(config: Record<string, string>): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(config)) {
      if (isEncrypted(value)) {
        try {
          result[key] = this.decryptPrefixed(value);
        } catch (error) {
          if (isLegacyProviderError(error)) {
            throw error;
          }
          result[key] = value;
        }
      } else {
        result[key] = value;
      }
    }

    return result;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// PBEWithHmacSHA256AndAES_256 - family layout (NOT Java Jasypt's layout)
// ════════════════════════════════════════════════════════════════════════════

export interface JasyptStrongEncryptorOptions {
  /** Key derivation iteration count (default: 1000) */
  iterations?: number;
  /** Salt size in bytes (default: 16) */
  saltSize?: number;
}

/**
 * PBKDF2-HMAC-SHA256 + AES-256-CBC encryptor in the family's "PBEWithHmacSHA256AndAES_256" layout.
 *
 * Stronger than PBEWithMD5AndDES, and readable by GoCrypt, PyCrypt, PHPCrypt and RustCrypt.
 *
 * NOT compatible with Java Jasypt. This class derives the IV from PBKDF2 and writes
 * `base64(salt ‖ ciphertext)`. Java Jasypt's PBEWITHHMACSHA256ANDAES_256 (with RandomIvGenerator)
 * writes `base64(salt ‖ random IV ‖ ciphertext)`. Decrypting a Java value with this class can
 * return corrupted text instead of throwing. To share values with Java, use `JasyptEncryptor`.
 *
 * @example
 * ```typescript
 * const enc = new JasyptStrongEncryptor('myPassword');
 * const encrypted = enc.encryptWithPrefix('secret');
 * ```
 */
export class JasyptStrongEncryptor {
  private password: Buffer;
  private iterations: number;
  private saltSize: number;
  private readonly KEY_SIZE = 32; // AES-256
  private readonly IV_SIZE = 16;  // AES block size

  /**
   * Create a new JasyptStrongEncryptor.
   *
   * @param password - The encryption password
   * @param options - Optional configuration
   */
  constructor(password: string, options: JasyptStrongEncryptorOptions = {}) {
    if (!password) {
      throw new Error('Password cannot be empty');
    }

    this.password = Buffer.from(password, 'utf-8');
    this.iterations = options.iterations ?? 1000;
    this.saltSize = options.saltSize ?? 16;
  }

  /**
   * Derive key and IV using PBKDF2-HMAC-SHA256.
   */
  private deriveKeyAndIv(salt: Buffer): { key: Buffer; iv: Buffer } {
    // Derive 48 bytes: 32 for key + 16 for IV
    const derived = crypto.pbkdf2Sync(
      this.password,
      salt,
      this.iterations,
      this.KEY_SIZE + this.IV_SIZE,
      'sha256'
    );

    return {
      key: derived.subarray(0, this.KEY_SIZE),
      iv: derived.subarray(this.KEY_SIZE),
    };
  }

  /**
   * Encrypt using AES-256-CBC with PBKDF2-HMAC-SHA256.
   */
  encrypt(plaintext: string): string {
    if (!plaintext) {
      throw new Error('Plaintext cannot be empty');
    }

    // Generate random salt
    const salt = crypto.randomBytes(this.saltSize);

    // Derive key and IV
    const { key, iv } = this.deriveKeyAndIv(salt);

    // Create AES cipher in CBC mode
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    // Encrypt with PKCS7 padding
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf-8'),
      cipher.final(),
    ]);

    // Combine salt + ciphertext
    const combined = Buffer.concat([salt, encrypted]);

    return combined.toString('base64');
  }

  /**
   * Encrypt and wrap with ENC(...) prefix.
   */
  encryptWithPrefix(plaintext: string): string {
    const encrypted = this.encrypt(plaintext);
    return `${ENC_PREFIX}${encrypted}${ENC_SUFFIX}`;
  }

  /**
   * Decrypt data encrypted with PBEWithHmacSHA256AndAES_256.
   */
  decrypt(encoded: string): string {
    if (!encoded) {
      throw new Error('Encoded value cannot be empty');
    }

    try {
      const combined = Buffer.from(encoded, 'base64');

      if (combined.length < this.saltSize + 16) {
        throw new Error('Invalid data');
      }

      const salt = combined.subarray(0, this.saltSize);
      const ciphertext = combined.subarray(this.saltSize);

      if (ciphertext.length % 16 !== 0) {
        throw new Error('Invalid data');
      }

      // Derive key and IV
      const { key, iv } = this.deriveKeyAndIv(salt);

      // Decrypt
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
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
   */
  decryptAllInString(input: string): string {
    return input.replace(ENC_PATTERN, (match) => {
      try {
        return this.decryptPrefixed(match);
      } catch {
        return match;
      }
    });
  }

  /**
   * Decrypt all ENC(...) values in an object.
   */
  decryptMap(config: Record<string, string>): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(config)) {
      if (isEncrypted(value)) {
        try {
          result[key] = this.decryptPrefixed(value);
        } catch {
          result[key] = value;
        }
      } else {
        result[key] = value;
      }
    }

    return result;
  }
}
