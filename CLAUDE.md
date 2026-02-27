# CLAUDE.md - Complete Development Context for NodeCrypt

> **IMPORTANT**: This file contains ALL context needed for Claude AI to understand and work on NodeCrypt.

---

## Project Summary

**NodeCrypt** is a Jasypt-like encryption library for Node.js, part of a cross-language encryption family.

```
Owner       : Fariz Fadian (github.com/farizfadian)
Repository  : github.com/farizfadian/nodecrypt
Language    : TypeScript / Node.js 18+
License     : MIT
Package     : nodecrypt-jasypt (npm)
Dependencies: ZERO (uses Node.js built-in crypto)
Created     : December 2024
```

---

## Cross-Language Family (ALL SAME ENC() FORMAT!)

| Project | Repository | Language | Package |
|---------|-----------|----------|---------|
| GoCrypt | github.com/farizfadian/gocrypt | Go 1.21+ | Go module |
| PyCrypt | github.com/farizfadian/pycrypt | Python 3.8+ | pycrypt-jasypt (PyPI) |
| **NodeCrypt** | github.com/farizfadian/nodecrypt | **Node.js 18+** | **nodecrypt-jasypt (npm)** |
| PHPCrypt | github.com/farizfadian/phpcrypt | PHP 8.1+ | farizfadian/phpcrypt (Packagist) |
| Jasypt | jasypt.org | Java | org.jasypt (Maven) |

**ALL USE JasyptEncryptor FOR CROSS-LANGUAGE COMPATIBILITY!**

---

## Project Structure

```
nodecrypt/
├── src/
│   ├── index.ts            # Package exports (all classes + utils)
│   ├── encryptor.ts        # AES-256-GCM (Encryptor) - NOT Java compatible
│   ├── jasypt-compat.ts    # JasyptEncryptor + JasyptStrongEncryptor
│   ├── config-loader.ts    # Load .env, JSON with auto-decrypt
│   ├── cli.ts              # CLI tool (nodecrypt command)
│   └── utils.ts            # isEncrypted(), ENC_PREFIX, ENC_SUFFIX, ENC_PATTERN
├── tests/
│   ├── encryptor.test.ts       # AES-256-GCM tests
│   ├── jasypt-compat.test.ts   # Jasypt compatibility tests
│   └── config-loader.test.ts   # Config loader tests
├── .github/workflows/
│   ├── ci.yml              # Test on Node 18/20/22 x Ubuntu/macOS/Windows
│   └── release.yml         # npm publish on tag push (needs NPM_TOKEN secret)
├── package.json            # nodecrypt-jasypt, engines: >=18
├── tsconfig.json           # target: ES2020, strict: true
├── tsup.config.ts          # Build CJS + ESM + DTS
├── jest.config.js          # ts-jest, auto OpenSSL legacy provider
└── README.md
```

---

## Three Encryptors

| Class | Algorithm | Java Compatible? | When to Use |
|-------|-----------|------------------|-------------|
| `Encryptor` | AES-256-GCM | NO | New Node.js-only projects |
| `JasyptEncryptor` | PBEWithMD5AndDES | YES | Cross-language config sharing |
| `JasyptStrongEncryptor` | PBEWithHmacSHA256AndAES_256 | YES | Jasypt strong mode |

### Constructor Signatures

```typescript
// AES-256-GCM (Node.js only)
new Encryptor(password: string, options?: { iterations?: number, saltSize?: number, keySize?: number })

// Jasypt default (Java compatible) - PBEWithMD5AndDES
new JasyptEncryptor(password: string, options?: { iterations?: number })

// Jasypt strong (Java compatible) - AES-256-CBC with PBKDF2
new JasyptStrongEncryptor(password: string, options?: { iterations?: number, saltSize?: number })
```

### Common Methods (all three encryptors)
```typescript
encrypt(plaintext: string): string              // Returns base64
encryptWithPrefix(plaintext: string): string    // Returns ENC(base64)
decrypt(encoded: string): string                // Decrypts base64
decryptPrefixed(value: string): string          // Decrypts ENC(base64)
decryptMap(obj: Record<string, string>): Record<string, string>  // Decrypt all ENC() values
decryptAllInString(input: string): string       // Decrypt all ENC() in a string
```

---

## Commands

```bash
# Install dependencies
npm install

# Build (CJS + ESM)
npm run build

# Test
npm test

# Test with coverage
npm run test:coverage

# CLI usage
node dist/cli.js encrypt -p password -v "secret"
node dist/cli.js encrypt -p password -v "secret" --jasypt
node dist/cli.js decrypt -p password -v "ENC(xxx)"
node dist/cli.js encrypt-file -p password -i .env.plain -o .env.encrypted

# CLI env var: NODECRYPT_PASSWORD
```

---

## API Reference

```typescript
import {
  Encryptor,
  JasyptEncryptor,
  JasyptStrongEncryptor,
  ConfigLoader,
  isEncrypted,
  ENC_PREFIX,
  ENC_SUFFIX,
} from 'nodecrypt-jasypt';

// Jasypt compatible (for BizCore / cross-language)
const enc = new JasyptEncryptor(password);
const encrypted = enc.encryptWithPrefix(plaintext);   // ENC(...)
const plaintext = enc.decryptPrefixed('ENC(...)');
const decryptedMap = enc.decryptMap(configObj);
const decryptedStr = enc.decryptAllInString(configStr);

// Config loading
const loader = new ConfigLoader(password);
const config = loader.loadEnvFile('.env');
loader.setToEnv('.env');  // Set to process.env
```

---

## OpenSSL Legacy Provider (CRITICAL)

### The Problem
JasyptEncryptor uses DES-CBC (PBEWithMD5AndDES). Starting with Node.js 17+ (which uses OpenSSL 3.0), DES is disabled by default.

### Solution: `--openssl-legacy-provider`
- **Node 18+**: Requires `--openssl-legacy-provider` flag to enable DES
- **Node 16 and below**: Uses OpenSSL 1.1, does NOT need/support this flag (Node 16 is EOL)

### jest.config.js Auto-Detection
The jest config automatically detects Node version and sets the flag:
```javascript
const nodeMajor = parseInt(process.version.split('.')[0].slice(1), 10);
if (nodeMajor >= 17 && !process.env.NODE_OPTIONS?.includes('--openssl-legacy-provider')) {
  process.env.NODE_OPTIONS = (process.env.NODE_OPTIONS || '') + ' --openssl-legacy-provider';
}
```

### CI Configuration
```yaml
env:
  NODE_OPTIONS: --openssl-legacy-provider
```

---

## Known Issues & Fixes Applied

### 1. DES Wrong Password - Flaky Test
DES-CBC has NO integrity check (unlike AES-GCM). Decrypting with wrong password may:
1. Throw due to invalid PKCS5 padding (most common)
2. Produce garbage output that happens to have valid padding (rare)

**Fix**: Use try/catch - if it throws, expected; if it doesn't throw, verify result != original.

### 2. Node 16 Dropped from CI
Node 16 is EOL (Sep 2023) and crashes with `--openssl-legacy-provider` flag. CI now tests Node 18/20/22 only. `package.json` engines set to `>=18.0.0`.

### 3. NPM Publish Requires Secret
Release workflow needs `NPM_TOKEN` secret configured in GitHub repo settings.

---

## CI/CD

### CI Matrix (ci.yml)
- **Node versions**: 18, 20, 22
- **OS**: ubuntu-latest, windows-latest, macos-latest
- **Total**: 9 test combinations (all green)

### Release (release.yml)
- Triggered on `v*` tag push
- Runs tests on Node 20 + ubuntu
- Publishes to npm (`npm publish --access public`)
- Creates GitHub Release
- Requires: `NPM_TOKEN` secret

---

## Build Output

tsup builds two formats:
- `dist/index.js` (CommonJS)
- `dist/index.mjs` (ESM)
- `dist/index.d.ts` (TypeScript declarations)
- `dist/cli.js` (CLI binary entry point)

---

<p align="center"><b>An idea from <a href="https://github.com/farizfadian">Fariz</a> and made with love by <a href="https://claude.ai">Claude AI</a></b></p>
