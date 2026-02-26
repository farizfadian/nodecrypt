# CLAUDE.md - Complete Development Context for NodeCrypt

> **IMPORTANT**: This file contains ALL context needed for Claude AI to understand and work on NodeCrypt.

---

## 🎯 Project Summary

**NodeCrypt** is a Jasypt-like encryption library for Node.js, part of a cross-language encryption family.

```
Owner       : Fariz Fadian (github.com/farizfadian)
Repository  : github.com/farizfadian/nodecrypt
Language    : TypeScript / Node.js 16+
License     : MIT
Package     : nodecrypt-jasypt (npm)
Dependencies: ZERO (uses Node.js built-in crypto)
Created     : December 2024
```

---

## 🔗 Cross-Language Family (ALL SAME ENC() FORMAT!)

```
┌─────────────────────────────────────────────────────────────────┐
│                 Jasypt Encryption Library Family                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   🐹 GoCrypt    github.com/farizfadian/gocrypt     (Go)         │
│   🐍 PyCrypt    github.com/farizfadian/pycrypt     (Python)     │
│   📦 NodeCrypt  github.com/farizfadian/nodecrypt   (Node.js)    │
│   🐘 PHPCrypt   github.com/farizfadian/phpcrypt    (PHP)        │
│   ☕ Jasypt     jasypt.org                         (Java)       │
│                                                                  │
│   ALL USE JasyptEncryptor FOR CROSS-LANGUAGE COMPATIBILITY!    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
nodecrypt/
├── src/
│   ├── index.ts            # Package exports
│   ├── encryptor.ts        # AES-256-GCM (Encryptor)
│   ├── jasypt-compat.ts    # JasyptEncryptor, JasyptStrongEncryptor
│   ├── config-loader.ts    # Load .env, JSON
│   ├── cli.ts              # CLI tool
│   └── utils.ts            # isEncrypted()
├── tests/
├── package.json
├── tsconfig.json
├── tsup.config.ts          # Build config (ESM + CJS)
└── README.md
```

---

## 🔐 Three Encryptors

| Class | Algorithm | Java Compatible? |
|-------|-----------|------------------|
| `Encryptor` | AES-256-GCM | ❌ NO |
| `JasyptEncryptor` | PBEWithMD5AndDES | ✅ YES |
| `JasyptStrongEncryptor` | AES-256-CBC | ✅ YES |

---

## 💻 Commands

```bash
# Install
npm install

# Build
npm run build

# Test
npm test

# CLI
node dist/cli.js encrypt -p password -v "secret" --jasypt
```

---

## 📝 API Reference

```typescript
import { JasyptEncryptor, ConfigLoader, isEncrypted } from 'nodecrypt-jasypt';

// Create
const enc = new JasyptEncryptor(password);

// Encrypt/Decrypt
const encrypted = enc.encryptWithPrefix(plaintext);  // ENC(...)
const plaintext = enc.decryptPrefixed('ENC(...)');

// Batch
const decryptedMap = enc.decryptMap(configObj);

// Config
const loader = new ConfigLoader(password);
const config = loader.loadEnvFile('.env');
```

---

## 🔧 Framework Support

- ✅ Express.js
- ✅ NestJS
- ✅ Fastify
- ✅ Next.js (server-side)
- ⚠️ Browser (needs crypto polyfill)

---

<p align="center"><b>Made with ❤️ from Claude AI</b></p>
