/**
 * Configuration file loader with automatic decryption.
 */

import * as fs from 'fs';
import { Encryptor, EncryptorOptions } from './encryptor';
import { isEncrypted } from './utils';

/**
 * Configuration file loader that automatically decrypts ENC(...) values.
 *
 * Supports .env and JSON files.
 *
 * @example
 * ```typescript
 * const loader = new ConfigLoader('myPassword');
 * const config = loader.loadEnvFile('.env');
 * console.log(config.DATABASE_PASSWORD); // decrypted value
 *
 * // Load and set as environment variables
 * loader.setToEnv('.env');
 * console.log(process.env.DATABASE_PASSWORD);
 * ```
 */
export class ConfigLoader {
  private encryptor: Encryptor;

  /**
   * Create a new ConfigLoader.
   *
   * @param password - The encryption password
   * @param options - Optional encryptor configuration
   */
  constructor(password: string, options?: EncryptorOptions) {
    this.encryptor = new Encryptor(password, options);
  }

  /**
   * Load and decrypt a .env file.
   *
   * @param filepath - Path to the .env file
   * @returns Object with key-value pairs (decrypted)
   */
  loadEnvFile(filepath: string): Record<string, string> {
    const content = fs.readFileSync(filepath, 'utf-8');
    const config: Record<string, string> = {};

    for (const line of content.split('\n')) {
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      // Split by first =
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();

      // Remove surrounding quotes
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      // Decrypt if encrypted
      if (isEncrypted(value)) {
        try {
          value = this.encryptor.decryptPrefixed(value);
        } catch {
          // Keep original on error
        }
      }

      config[key] = value;
    }

    return config;
  }

  /**
   * Load and decrypt a JSON configuration file.
   *
   * Recursively decrypts all ENC(...) string values.
   *
   * @param filepath - Path to the JSON file
   * @returns Object with all ENC(...) values decrypted
   */
  loadJson<T = Record<string, unknown>>(filepath: string): T {
    const content = fs.readFileSync(filepath, 'utf-8');
    const config = JSON.parse(content);
    return this.decryptRecursive(config);
  }

  /**
   * Recursively decrypt all ENC(...) values in an object.
   */
  private decryptRecursive<T>(obj: T): T {
    if (typeof obj === 'string') {
      if (isEncrypted(obj)) {
        try {
          return this.encryptor.decryptPrefixed(obj) as T;
        } catch {
          return obj;
        }
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.decryptRecursive(item)) as T;
    }

    if (obj !== null && typeof obj === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.decryptRecursive(value);
      }
      return result as T;
    }

    return obj;
  }

  /**
   * Load an env file and set values as environment variables.
   *
   * @param filepath - Path to the .env file
   */
  setToEnv(filepath: string): void {
    const config = this.loadEnvFile(filepath);
    for (const [key, value] of Object.entries(config)) {
      process.env[key] = value;
    }
  }
}
