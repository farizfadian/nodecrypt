/**
 * NodeCrypt - Jasypt-like encryption library for Node.js
 *
 * Encrypt your application configuration with the familiar ENC(...)
 * pattern used in Spring Boot applications.
 *
 * @example
 * ```typescript
 * import { Encryptor } from 'nodecrypt-jasypt';
 *
 * const enc = new Encryptor('myPassword');
 * const encrypted = enc.encryptWithPrefix('db_password');
 * // ENC(base64...)
 *
 * const decrypted = enc.decryptPrefixed(encrypted);
 * // db_password
 * ```
 *
 * For Java Jasypt compatibility:
 * ```typescript
 * import { JasyptEncryptor } from 'nodecrypt-jasypt';
 *
 * const enc = new JasyptEncryptor('myPassword');
 * const decrypted = enc.decryptPrefixed('ENC(fromJava)');
 * ```
 *
 * Made with ❤️ from Claude AI for Node.js developers who need Jasypt.
 *
 * @packageDocumentation
 */

export { Encryptor, EncryptorOptions } from './encryptor';
export {
  JasyptEncryptor,
  JasyptEncryptorOptions,
  JasyptStrongEncryptor,
  JasyptStrongEncryptorOptions,
} from './jasypt-compat';
export { ConfigLoader } from './config-loader';
export { isEncrypted, ENC_PREFIX, ENC_SUFFIX } from './utils';
