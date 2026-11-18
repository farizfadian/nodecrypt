# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.1] - 2026-11-19

### Fixed
- **`JasyptEncryptor` explains the missing legacy provider.** On Node.js 17+ without `--openssl-legacy-provider`,
  errors now say how to enable DES instead of only `error:0308010C:digital envelope routines::unsupported`. The
  error keeps code `ERR_OSSL_EVP_UNSUPPORTED`.
- **`JasyptEncryptor.decryptMap()` and `decryptAllInString()` throw that error** instead of silently returning every
  `ENC(...)` value unchanged. Other decrypt failures still keep the original value, as before.
- **CLI:** `nodecrypt version` now reports the package version (it was hard-coded to `1.0.0`), and error output no
  longer starts with `Error: Error:`.

### Documentation
- **Corrected: `JasyptStrongEncryptor` is not compatible with Java Jasypt.** Verified against Jasypt 1.9.3: Java uses
  `salt ‖ random IV ‖ ciphertext`, while this library (like GoCrypt/PyCrypt/PHPCrypt/RustCrypt) derives the IV from
  PBKDF2 and writes `salt ‖ ciphertext`. It remains compatible within the family. Use `JasyptEncryptor` for Java.
- README: new section on `--openssl-legacy-provider`, a corrected compatibility matrix, and a note that `ConfigLoader`
  decrypts only `Encryptor` values and keeps undecryptable values as `ENC(...)`.

### Tests
- `JasyptEncryptor` decrypts values produced by Java Jasypt 1.9.3 (fixed vectors, including unicode).
- Legacy-provider error message, error code, and `decryptMap()`/`decryptAllInString()` propagation.

---

## [1.0.0] - 2024-12-28

### 🎉 Initial Release

First public release of NodeCrypt - Jasypt-like encryption for Node.js.

### Added

#### Core Features
- **AES-256-GCM Encryption** (`Encryptor`) - Modern, secure encryption for new projects
- **Jasypt Compatible** (`JasyptEncryptor`) - PBEWithMD5AndDES for Java Jasypt compatibility
- **Jasypt Strong** (`JasyptStrongEncryptor`) - PBEWithHmacSHA256AndAES_256

#### ENC(...) Pattern
- `ENC(base64value)` format matching Jasypt/Spring Boot
- `isEncrypted()` helper function
- `encryptWithPrefix()` and `decryptPrefixed()` methods

#### Config Loaders
- `.env` file loader with auto-decryption
- JSON file loader with recursive decryption
- `setToEnv()` to load config to process.env

#### Batch Operations
- `decryptMap()` - Decrypt all values in an object
- `decryptAllInString()` - Decrypt all ENC(...) values in a string

#### CLI Tool
- `nodecrypt encrypt` - Encrypt single value
- `nodecrypt decrypt` - Decrypt single value
- `nodecrypt encrypt-file` - Encrypt all values in a file
- `nodecrypt decrypt-file` - Decrypt all ENC(...) values in a file
- Support for `--jasypt` and `--jasypt-strong` flags
- Support for `NODECRYPT_PASSWORD` environment variable

#### TypeScript
- Full TypeScript support
- Type definitions included
- ESM and CommonJS builds

#### Cross-Language Compatibility
- Compatible with GoCrypt (Go)
- Compatible with PyCrypt (Python)
- Compatible with Java Jasypt
- Shared `ENC(...)` format across all languages

### Dependencies
- Zero production dependencies (uses Node.js built-in crypto)

---

Made with ❤️ from Claude AI for Node.js developers who need Jasypt
