import nodeCrypto = require('crypto');
import { JasyptEncryptor, JasyptStrongEncryptor } from '../src/jasypt-compat';
import { isEncrypted } from '../src/utils';

describe('JasyptEncryptor', () => {
  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt simple text', () => {
      const enc = new JasyptEncryptor('mySecretPassword');
      const plaintext = 'hello';

      const encrypted = enc.encrypt(plaintext);
      const decrypted = enc.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle text with spaces', () => {
      const enc = new JasyptEncryptor('password');
      const plaintext = 'hello world';

      const encrypted = enc.encrypt(plaintext);
      const decrypted = enc.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle special characters', () => {
      const enc = new JasyptEncryptor('password');
      const plaintext = 'p@$$w0rd!#$%';

      const encrypted = enc.encrypt(plaintext);
      const decrypted = enc.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode', () => {
      const enc = new JasyptEncryptor('password');
      const plaintext = 'こんにちは';

      const encrypted = enc.encrypt(plaintext);
      const decrypted = enc.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle connection strings', () => {
      const enc = new JasyptEncryptor('password');
      const plaintext = 'jdbc:mysql://localhost:3306/mydb';

      const encrypted = enc.encrypt(plaintext);
      const decrypted = enc.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('encryptWithPrefix/decryptPrefixed', () => {
    it('should encrypt with ENC(...) prefix', () => {
      const enc = new JasyptEncryptor('password');
      const plaintext = 'myDatabasePassword';

      const encrypted = enc.encryptWithPrefix(plaintext);

      expect(isEncrypted(encrypted)).toBe(true);

      const decrypted = enc.decryptPrefixed(encrypted);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('error handling', () => {
    it('should fail to decrypt with wrong password', () => {
      const enc1 = new JasyptEncryptor('correctPassword');
      const enc2 = new JasyptEncryptor('wrongPassword');

      const encrypted = enc1.encrypt('secret');

      // DES-CBC has no integrity check, so wrong password may either:
      // 1. Throw due to invalid PKCS5 padding (most common)
      // 2. Produce garbage output that happens to have valid padding (rare)
      try {
        const result = enc2.decrypt(encrypted);
        // If it didn't throw, the result should not match the original
        expect(result).not.toBe('secret');
      } catch {
        // Expected: decryption fails with bad padding
        expect(true).toBe(true);
      }
    });
  });

  describe('decryptMap', () => {
    it('should decrypt all ENC(...) values in an object', () => {
      const enc = new JasyptEncryptor('mapPassword');

      const encPass = enc.encryptWithPrefix('dbPassword123');
      const encKey = enc.encryptWithPrefix('apiKey456');

      const config = {
        host: 'localhost',
        port: '3306',
        password: encPass,
        api_key: encKey,
      };

      const decrypted = enc.decryptMap(config);

      expect(decrypted.host).toBe('localhost');
      expect(decrypted.password).toBe('dbPassword123');
      expect(decrypted.api_key).toBe('apiKey456');
    });
  });

  describe('decryptAllInString', () => {
    it('should decrypt all ENC values in a string', () => {
      const enc = new JasyptEncryptor('stringPassword');

      const enc1 = enc.encryptWithPrefix('user123');
      const enc2 = enc.encryptWithPrefix('pass456');

      const input = `username=${enc1}\npassword=${enc2}`;
      const result = enc.decryptAllInString(input);

      expect(result).toContain('username=user123');
      expect(result).toContain('password=pass456');
    });
  });

  describe('custom options', () => {
    it('should work with custom iterations', () => {
      const enc = new JasyptEncryptor('password', { iterations: 2000 });

      const plaintext = 'test value';
      const encrypted = enc.encrypt(plaintext);
      const decrypted = enc.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('values produced by Java Jasypt 1.9.3', () => {
    // Generated with org.jasypt:jasypt:1.9.3 StandardPBEStringEncryptor defaults
    // (PBEWithMD5AndDES, 1000 iterations, no IV generator), password 'mySecretPassword'.
    const JAVA_VECTORS = [
      { plain: 'db_password123', ct: '+LGHNsNjMivOnB5dCYuuvuorhULNBlEp' },
      { plain: 'héllo wörld 日本 🔐', ct: 'NIQI1amR45BzeChD0e3IpSqEjVylwWP9W1Nefub8MZJqLJ4zdrOLVw==' },
    ];

    it.each(JAVA_VECTORS)('should decrypt the Java value of "$plain"', ({ plain, ct }) => {
      const enc = new JasyptEncryptor('mySecretPassword');

      expect(enc.decrypt(ct)).toBe(plain);
      expect(enc.decryptPrefixed(`ENC(${ct})`)).toBe(plain);
    });
  });

  describe('when DES is unavailable (OpenSSL 3 without --openssl-legacy-provider)', () => {
    const unsupported = (): never => {
      throw Object.assign(new Error('error:0308010C:digital envelope routines::unsupported'), {
        code: 'ERR_OSSL_EVP_UNSUPPORTED',
      });
    };
    let valid: string;

    beforeAll(() => {
      valid = new JasyptEncryptor('pw').encryptWithPrefix('secret');
    });

    beforeEach(() => {
      jest.spyOn(nodeCrypto, 'createCipheriv').mockImplementation(unsupported);
      jest.spyOn(nodeCrypto, 'createDecipheriv').mockImplementation(unsupported);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    const expectLegacyProviderHint = (fn: () => unknown): void => {
      let caught: unknown;
      try {
        fn();
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(Error);
      expect((caught as Error).message).toContain('--openssl-legacy-provider');
      expect((caught as NodeJS.ErrnoException).code).toBe('ERR_OSSL_EVP_UNSUPPORTED');
    };

    it('encrypt should explain how to enable DES', () => {
      expectLegacyProviderHint(() => new JasyptEncryptor('pw').encrypt('secret'));
    });

    it('decryptPrefixed should explain how to enable DES', () => {
      expectLegacyProviderHint(() => new JasyptEncryptor('pw').decryptPrefixed(valid));
    });

    it('decryptMap should throw instead of silently returning ENC(...)', () => {
      expectLegacyProviderHint(() => new JasyptEncryptor('pw').decryptMap({ password: valid }));
    });

    it('decryptAllInString should throw instead of silently returning ENC(...)', () => {
      expectLegacyProviderHint(() => new JasyptEncryptor('pw').decryptAllInString(`password=${valid}`));
    });
  });

  describe('decryptMap with undecryptable data', () => {
    it('should still keep the original value when the data itself is invalid', () => {
      const enc = new JasyptEncryptor('pw');

      expect(enc.decryptMap({ password: 'ENC(notvalid)', host: 'h' })).toEqual({
        password: 'ENC(notvalid)',
        host: 'h',
      });
    });
  });
});

describe('JasyptStrongEncryptor', () => {
  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt simple text', () => {
      const enc = new JasyptStrongEncryptor('mySecretPassword');
      const plaintext = 'hello';

      const encrypted = enc.encrypt(plaintext);
      const decrypted = enc.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle text with spaces', () => {
      const enc = new JasyptStrongEncryptor('password');
      const plaintext = 'hello world';

      const encrypted = enc.encrypt(plaintext);
      const decrypted = enc.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle special characters', () => {
      const enc = new JasyptStrongEncryptor('password');
      const plaintext = 'p@$$w0rd!#$%';

      const encrypted = enc.encrypt(plaintext);
      const decrypted = enc.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode', () => {
      const enc = new JasyptStrongEncryptor('password');
      const plaintext = 'こんにちは世界';

      const encrypted = enc.encrypt(plaintext);
      const decrypted = enc.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle long text', () => {
      const enc = new JasyptStrongEncryptor('password');
      const plaintext = 'This is a much longer text for testing AES-256 encryption.';

      const encrypted = enc.encrypt(plaintext);
      const decrypted = enc.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('encryptWithPrefix/decryptPrefixed', () => {
    it('should encrypt with ENC(...) prefix', () => {
      const enc = new JasyptStrongEncryptor('strongPassword');
      const plaintext = 'sensitiveData';

      const encrypted = enc.encryptWithPrefix(plaintext);

      expect(isEncrypted(encrypted)).toBe(true);

      const decrypted = enc.decryptPrefixed(encrypted);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('custom options', () => {
    it('should work with custom options', () => {
      const enc = new JasyptStrongEncryptor('password', {
        iterations: 5000,
        saltSize: 32,
      });

      const plaintext = 'test';
      const encrypted = enc.encrypt(plaintext);
      const decrypted = enc.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });
});
