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
Status      : ✅ PUBLISHED & TESTED (v1.0.1)
Install     : npm i nodecrypt-jasypt
Registry    : npm (npmjs.com/package/nodecrypt-jasypt)
Release     : Auto-publish via GitHub Actions on tag push (v*)
Auth        : OIDC Trusted Publishing (no token, no rotation) — see "Publishing / Authentication"
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
│   └── release.yml         # npm publish on tag push (via OIDC trusted publishing, no token)
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
| `JasyptStrongEncryptor` | PBEWithHmacSHA256AndAES_256 (family layout) | **NO** (see Known Issue 4) | Sharing with GoCrypt/PyCrypt/PHPCrypt/RustCrypt |

### Constructor Signatures

```typescript
// AES-256-GCM (Node.js only)
new Encryptor(password: string, options?: { iterations?: number, saltSize?: number, keySize?: number })

// Jasypt default (Java compatible) - PBEWithMD5AndDES
new JasyptEncryptor(password: string, options?: { iterations?: number })

// Family "strong" layout (NOT Java compatible) - AES-256-CBC with PBKDF2, IV derived
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

// Jasypt compatible (for Java / cross-language)
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

### Error Message Without the Flag (since 1.0.1)
OpenSSL's own error (`error:0308010C:digital envelope routines::unsupported`) does not mention the flag.
`src/jasypt-compat.ts` (`withLegacyProviderHint`) rethrows it with the fix in the message and keeps
`code = 'ERR_OSSL_EVP_UNSUPPORTED'`. `decryptMap()` and `decryptAllInString()` rethrow this one error instead of
swallowing it, because no value can be decrypted without DES. Other decrypt errors are still swallowed (value kept).

### Gotcha: Running a Single Jest File
`jest.config.js` sets `NODE_OPTIONS` after the main jest process has started, and OpenSSL reads providers only at
process start. `npm test` (two files) runs tests in fresh workers, which inherit the flag. `npx jest <one file>`
runs in-band in the main process, so every DES test fails with `0308010C`. Run single files with the flag set first:
`NODE_OPTIONS=--openssl-legacy-provider npx jest tests/jasypt-compat.test.ts`.

---

## Known Issues & Fixes Applied

### 1. DES Wrong Password - Flaky Test
DES-CBC has NO integrity check (unlike AES-GCM). Decrypting with wrong password may:
1. Throw due to invalid PKCS5 padding (most common)
2. Produce garbage output that happens to have valid padding (rare)

**Fix**: Use try/catch - if it throws, expected; if it doesn't throw, verify result != original.

### 2. Node 16 Dropped from CI
Node 16 is EOL (Sep 2023) and crashes with `--openssl-legacy-provider` flag. CI now tests Node 18/20/22 only. `package.json` engines set to `>=18.0.0`.

### 3. NPM Publish Uses OIDC Trusted Publishing (No Token)
Publishing is authenticated via **OIDC trusted publishing** — there is **NO `NPM_TOKEN` secret**.
npm verifies a short-lived, workflow-specific identity issued by GitHub Actions instead of a
stored token. See the "Publishing / Authentication" section below for the full setup.

### 4. JasyptStrongEncryptor Is NOT Java Jasypt Compatible (verified 19 Nov 2026)
Tested against real Java Jasypt 1.9.3 (`org.jasypt:jasypt:1.9.3`, Java 25): fails in both directions.
- NodeCrypt (and the whole family): PBKDF2-HMAC-SHA256 derives 48 bytes, key = [0..32], **IV = [32..48]**,
  output `base64(salt ‖ ciphertext)`.
- Java Jasypt `PBEWITHHMACSHA256ANDAES_256`: needs an IV generator, normally `RandomIvGenerator` (with
  `NoIvGenerator` Jasypt cannot even round-trip itself), output `base64(salt ‖ random IV ‖ ciphertext)`.
- The key is identical; only the IV placement differs. Inserting the derived IV after the salt makes a NodeCrypt
  value readable by Java.
- `JasyptStrongEncryptor.decrypt(javaValue)` does **not** throw: it returns 16 garbage bytes + the plaintext.
- This is the family layout (documented the same way in rustcrypt's CLAUDE.md). Moving to Java's layout breaks
  existing ciphertext and must be a coordinated change across all five libraries. A dual-layout decrypt would need
  an explicit option, because CBC without a MAC cannot reliably auto-detect the layout.
- Repo tests only round-trip Node→Node, which is why this was never caught. `JasyptEncryptor` now has
  real Java vectors in `tests/jasypt-compat.test.ts`.

### 5. ConfigLoader Is AES-256-GCM Only, and Silent on Failure
`ConfigLoader` always uses `Encryptor`, so Jasypt ENC() values (DES or strong) are not decrypted. Any value it
cannot decrypt, including with a wrong password, is kept as the literal `ENC(...)` with no error. Documented in
README with a fail-fast `isEncrypted()` check. RustCrypt's `ConfigLoader<E = Encryptor>` is the family precedent if
this is ever made encryptor-agnostic.

---

## CI/CD

### CI Matrix (ci.yml)
- **Node versions**: 18, 20, 22
- **OS**: ubuntu-latest, windows-latest, macos-latest
- **Total**: 9 test combinations (all green)

### Release (release.yml)
- Triggered on `v*` tag push
- Runs tests on Node 20 + ubuntu
- Publishes to npm (`npm publish --access public`) via **OIDC trusted publishing**
- Creates GitHub Release
- Requires: `id-token: write` permission + npm >= 11.5.1 on the runner (NO token/secret)
- Provenance attestation is generated automatically

---

## Build Output

tsup builds two formats:
- `dist/index.js` (CommonJS)
- `dist/index.mjs` (ESM)
- `dist/index.d.ts` (TypeScript declarations)
- `dist/cli.js` (CLI binary entry point)

`nodecrypt version` prints `__NODECRYPT_VERSION__`, which `tsup.config.ts` fills from `package.json` at build time
(`define`). Do not hard-code the version in `src/cli.ts`: `npm version` only bumps `package.json`.

---

## 🔐 Publishing / Authentication (OIDC Trusted Publishing)

NodeCrypt publishes to npm using **OIDC trusted publishing** — there is **no `NPM_TOKEN`** and
nothing to rotate. (Migrated from token-based auth on 13 June 2026; the old `NPM_TOKEN` secret
and the 90-day renewal reminder are obsolete.)

### How it works
- On a `v*` tag push, GitHub Actions requests a short-lived OIDC identity token.
- That token proves "this is workflow `release.yml` from repo `farizfadian/nodecrypt`".
- npm trusts that identity (configured as a Trusted Publisher) and allows the publish.
- No long-lived secret is stored anywhere; the credential lives only for that single job.

### npm side (one-time, already configured)
npmjs.com/package/nodecrypt-jasypt/access → **Trusted Publisher** → GitHub Actions:
- Organization/user : `farizfadian`
- Repository        : `nodecrypt`
- Workflow filename : `release.yml`
- Environment       : (none)
- Allowed actions   : `npm publish`

### Workflow side (release.yml)
The `release` job MUST have these permissions:
```yaml
permissions:
  contents: write   # for the "Create GitHub Release" step
  id-token: write   # REQUIRED for OIDC trusted publishing
```
…plus npm upgraded to >= 11.5.1 on the runner (`npm install -g npm@latest`) and a plain
`npm publish --access public` with **no** `NODE_AUTH_TOKEN` / `secrets.NPM_TOKEN`.
Provenance is published automatically (no `--provenance` flag needed).

### Gotchas
- Trusted Publisher fields are case-sensitive and must match the workflow exactly (org, repo, filename).
- `package.json` `repository.url` must match the GitHub repo URL.
- Trusted-publisher configs created after 20 May 2026 must explicitly select at least one allowed action.

---

## 📦 Publish & Release Status

| Item | Status |
|------|--------|
| Published | ✅ v1.0.1 on npm (1.0.0 on 2024-12-28, 1.0.1 on 2026-11-19) |
| Install | `npm i nodecrypt-jasypt` |
| CI | ✅ GitHub Actions (Node 18/20/22, multi-OS) |
| Release | ✅ Auto-publish on `git tag v*` + push |
| Auth | ✅ OIDC Trusted Publishing (no token, no 90-day rotation) |
| Cross-language tested | ✅ Node ↔ GoCrypt CLI, all three classes, both directions (19 Nov 2026). ✅ Node ↔ Java Jasypt 1.9.3 for `JasyptEncryptor` only; strong mode ❌ (Known Issue 4). Python/PHP/Rust: same layout by code reading, not re-run |

### How to release a new version:
```bash
# 1. Bump version (creates a commit + matching vX.Y.Z tag)
npm version patch        # or: minor / major

# 2. Push the commit and the tag
git push origin main --follow-tags

# GitHub Actions (release.yml) then publishes to npm automatically via OIDC.
# No token needed — authentication is handled by OIDC trusted publishing.
```

---

## 📋 Full Context Reference

For complete cross-language context, see:
the maintainer's private family context document (`JASYPT-MULTI-LANGUAGE-CONTEXT.md`, kept outside this repository)

---

<p align="center"><b>An idea from <a href="https://github.com/farizfadian">Fariz</a> and made with love by <a href="https://claude.ai">Claude AI</a></b></p>
