# NodeCrypt 🔐

[![CI](https://github.com/farizfadian/nodecrypt/actions/workflows/ci.yml/badge.svg)](https://github.com/farizfadian/nodecrypt/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/nodecrypt-jasypt.svg)](https://badge.fury.io/js/nodecrypt-jasypt)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

**Jasypt-like encryption library for Node.js** - Encrypt your application configuration with the familiar `ENC(...)` pattern used in Spring Boot applications.

> **Made with ❤️ from Claude AI for Node.js developers who need Jasypt**

---

## 🎯 Why NodeCrypt?

If you're coming from Java/Spring Boot world and need to share encrypted configuration across multiple languages, NodeCrypt is for you! It provides:

- ✅ **Familiar `ENC(...)` pattern** - Just like Jasypt in Spring Boot
- ✅ **Java Jasypt compatibility** - Decrypt values encrypted by Java
- ✅ **TypeScript support** - Full type definitions included
- ✅ **Multiple algorithms** - From legacy Jasypt to modern AES-256-GCM
- ✅ **CLI tool included** - Encrypt/decrypt from command line
- ✅ **Cross-platform** - Works with GoCrypt, PyCrypt, and Java Jasypt

---

## 📦 Installation

```bash
npm install nodecrypt-jasypt
```

---

## 🚀 Quick Start

### Basic Encryption/Decryption

```typescript
import { Encryptor } from 'nodecrypt-jasypt';

// Create encryptor with password
const enc = new Encryptor('mySecretPassword');

// Encrypt
const encrypted = enc.encryptWithPrefix('db_password_123');
console.log(encrypted); // ENC(base64encodedvalue...)

// Decrypt
const decrypted = enc.decryptPrefixed(encrypted);
console.log(decrypted); // db_password_123
```

### Loading Encrypted Configuration

```typescript
import { ConfigLoader } from 'nodecrypt-jasypt';

// .env file:
// DATABASE_HOST=localhost
// DATABASE_PASSWORD=ENC(AbCdEf123456...)

const loader = new ConfigLoader(process.env.NODECRYPT_PASSWORD!);
const config = loader.loadEnvFile('.env');

console.log(config.DATABASE_PASSWORD); // actual_password
```

---

## 🔐 Encryption Algorithms

| Encryptor | Algorithm | Security | Use Case |
|-----------|-----------|----------|----------|
| `Encryptor` | AES-256-GCM | ⭐⭐⭐⭐⭐ | **Recommended** for new projects |
| `JasyptStrongEncryptor` | PBEWithHmacSHA256AndAES_256 | ⭐⭐⭐⭐ | Jasypt strong compatibility |
| `JasyptEncryptor` | PBEWithMD5AndDES | ⭐⭐ | Legacy Jasypt compatibility |

### Choose the Right Algorithm

```typescript
import { Encryptor, JasyptEncryptor, JasyptStrongEncryptor } from 'nodecrypt-jasypt';

// RECOMMENDED: For new Node.js projects
const enc = new Encryptor(password);

// For compatibility with Java Jasypt (default algorithm)
const enc = new JasyptEncryptor(password);

// For compatibility with Java Jasypt (strong encryption)
const enc = new JasyptStrongEncryptor(password);
```

---

## ☕ Java Jasypt Compatibility

### ⚠️ Important: Compatibility Matrix

```
┌─────────────────────────────────────────────────────────────────┐
│            ENCRYPT WITH → DECRYPT WITH                          │
├─────────────────────────────────────────────────────────────────┤
│ Java Jasypt (default)  → JasyptEncryptor        ✅ YES          │
│ Java Jasypt (strong)   → JasyptStrongEncryptor  ✅ YES          │
│ Java Jasypt (default)  → Encryptor              ❌ NO           │
│ Encryptor              → Java Jasypt            ❌ NO           │
│ JasyptEncryptor        → Java Jasypt            ✅ YES          │
│ GoCrypt JasyptEnc      → JasyptEncryptor        ✅ YES          │
│ PyCrypt JasyptEnc      → JasyptEncryptor        ✅ YES          │
└─────────────────────────────────────────────────────────────────┘
```

### Decrypt Values from Java

```typescript
import { JasyptEncryptor } from 'nodecrypt-jasypt';

// Your Java application.properties has:
// db.password=ENC(xxxFromJavaxxx)

const enc = new JasyptEncryptor(samePasswordAsJava);
const decrypted = enc.decryptPrefixed('ENC(xxxFromJavaxxx)'); // ✅ Works!
```

### Share Config with Go/Python

```typescript
import { JasyptEncryptor } from 'nodecrypt-jasypt';

// Use JasyptEncryptor so all languages can read
const enc = new JasyptEncryptor(sharedPassword);
const encrypted = enc.encryptWithPrefix('shared_secret');

// This ENC(...) value can be decrypted by:
// - Node.js: using JasyptEncryptor
// - Go: using gocrypt.NewJasyptEncryptor
// - Python: using pycrypt.JasyptEncryptor
// - Java: using Jasypt library
```

---

## 📖 Usage Guide

### Configuration Files

#### .env File

```env
# config.env
DATABASE_HOST=localhost
DATABASE_PASSWORD=ENC(AbCdEf123456...)
API_KEY=ENC(XyZ789...)
```

```typescript
import { ConfigLoader } from 'nodecrypt-jasypt';

const loader = new ConfigLoader(password);
const config = loader.loadEnvFile('config.env');
console.log(config.DATABASE_PASSWORD); // decrypted value
```

#### JSON File

```typescript
const config = loader.loadJson<MyConfig>('config.json');
```

#### Set to Environment Variables

```typescript
loader.setToEnv('.env');
// Now use process.env
console.log(process.env.DATABASE_PASSWORD);
```

### Decrypt Map

```typescript
const config = {
  host: 'localhost',
  password: 'ENC(encrypted_value)',
};

const decrypted = enc.decryptMap(config);
console.log(decrypted.password); // plaintext
```

### Check if Value is Encrypted

```typescript
import { isEncrypted } from 'nodecrypt-jasypt';

if (isEncrypted(value)) {
  const decrypted = enc.decryptPrefixed(value);
}
```

---

## 💻 CLI Tool

### Usage

```bash
# Encrypt a value
nodecrypt encrypt -p mySecret -v "database_password"
# Output: ENC(base64value...)

# Decrypt a value
nodecrypt decrypt -p mySecret -v "ENC(base64value...)"
# Output: database_password

# Encrypt all values in a file
nodecrypt encrypt-file -p mySecret -i .env.plain -o .env.encrypted

# Decrypt all values in a file
nodecrypt decrypt-file -p mySecret -i .env.encrypted -o .env.plain

# Use Jasypt-compatible algorithm
nodecrypt encrypt -p mySecret -v "secret" --jasypt

# Use environment variable for password
export NODECRYPT_PASSWORD=mySecret
nodecrypt encrypt -v "secret_value"
```

---

## 🔧 Framework Integration

### Express.js

```typescript
import express from 'express';
import { ConfigLoader } from 'nodecrypt-jasypt';

const loader = new ConfigLoader(process.env.NODECRYPT_PASSWORD!);
loader.setToEnv('.env');

const app = express();

// Now use decrypted config
const dbPassword = process.env.DATABASE_PASSWORD;
```

### NestJS

```typescript
import { ConfigLoader } from 'nodecrypt-jasypt';

// In your config module
const loader = new ConfigLoader(process.env.NODECRYPT_PASSWORD!);
const config = loader.loadEnvFile('.env');

export default () => ({
  database: {
    password: config.DATABASE_PASSWORD,
  },
});
```

### Next.js (Server-side)

```typescript
// In next.config.js or API routes
import { JasyptEncryptor } from 'nodecrypt-jasypt';

const enc = new JasyptEncryptor(process.env.NODECRYPT_PASSWORD!);
const dbPassword = enc.decryptPrefixed(process.env.DATABASE_PASSWORD!);
```

---

## ⚙️ Advanced Configuration

### Custom Options

```typescript
// Encryptor (AES-256-GCM)
const enc = new Encryptor(password, {
  iterations: 50000,  // default: 10000
  saltSize: 32,       // default: 16
  keySize: 32,        // 32 = AES-256
});

// Jasypt Compatible
const enc = new JasyptEncryptor(password, {
  iterations: 2000,   // default: 1000
});

// Jasypt Strong
const enc = new JasyptStrongEncryptor(password, {
  iterations: 5000,
  saltSize: 32,
});
```

---

## 📚 API Reference

### Encryptor

```typescript
const enc = new Encryptor(password, options?);

enc.encrypt(plaintext): string;           // Returns base64
enc.encryptWithPrefix(plaintext): string; // Returns ENC(base64)
enc.decrypt(base64): string;
enc.decryptPrefixed(value): string;
enc.decryptAllInString(input): string;
enc.decryptMap(config): Record<string, string>;
```

### JasyptEncryptor

```typescript
const enc = new JasyptEncryptor(password, options?);
// Same methods as Encryptor
```

### JasyptStrongEncryptor

```typescript
const enc = new JasyptStrongEncryptor(password, options?);
// Same methods as Encryptor
```

### ConfigLoader

```typescript
const loader = new ConfigLoader(password, options?);

loader.loadEnvFile(filepath): Record<string, string>;
loader.loadJson<T>(filepath): T;
loader.setToEnv(filepath): void;
```

### Utility Functions

```typescript
import { isEncrypted, ENC_PREFIX, ENC_SUFFIX } from 'nodecrypt-jasypt';

isEncrypted('ENC(abc)');  // true
isEncrypted('plaintext'); // false
```

---

## 🧪 Testing

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run with coverage
npm run test:coverage
```

---

## 📁 Project Structure

```
nodecrypt/
├── src/
│   ├── index.ts           # Package exports
│   ├── encryptor.ts       # AES-256-GCM encryption
│   ├── jasypt-compat.ts   # Jasypt compatibility
│   ├── config-loader.ts   # Config file loader
│   ├── cli.ts             # CLI tool
│   └── utils.ts           # Utility functions
├── tests/
│   ├── encryptor.test.ts
│   └── jasypt-compat.test.ts
├── package.json
├── tsconfig.json
├── README.md
└── LICENSE
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🔗 Related Projects

- [GoCrypt](https://github.com/farizfadian/gocrypt) - Jasypt-like encryption for Go
- [PyCrypt](https://github.com/farizfadian/pycrypt) - Jasypt-like encryption for Python
- [Jasypt](http://www.jasypt.org/) - Original Java library

---

<p align="center">
  <b>Made with ❤️ from Claude AI for Node.js developers who need Jasypt</b>
</p>
