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
