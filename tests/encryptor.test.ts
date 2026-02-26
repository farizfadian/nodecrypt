import { Encryptor } from '../src/encryptor';
import { isEncrypted } from '../src/utils';

describe('Encryptor', () => {
  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt simple text', () => {
      const enc = new Encryptor('mySecretPassword');
      const plaintext = 'hello';

      const encrypted = enc.encrypt(plaintext);
      const decrypted = enc.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
      expect(encrypted).not.toBe(plaintext);
    });

    it('should handle text with spaces', () => {
      const enc = new Encryptor('password');
      const plaintext = 'hello world with spaces';

      const encrypted = enc.encrypt(plaintext);
      const decrypted = enc.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle special characters', () => {
      const enc = new Encryptor('password');
      const plaintext = 'p@$$w0rd!#$%^&*()';

      const encrypted = enc.encrypt(plaintext);
      const decrypted = enc.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      const enc = new Encryptor('password');
      const plaintext = 'こんにちは世界 🔐';

      const encrypted = enc.encrypt(plaintext);
      const decrypted = enc.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle JSON content', () => {
      const enc = new Encryptor('password');
      const plaintext = '{"username":"admin","password":"secret123"}';

      const encrypted = enc.encrypt(plaintext);
      const decrypted = enc.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle connection strings', () => {
      const enc = new Encryptor('password');
      const plaintext = 'postgresql://user:pass@localhost:5432/dbname?sslmode=disable';

      const encrypted = enc.encrypt(plaintext);
      const decrypted = enc.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('encryptWithPrefix/decryptPrefixed', () => {
    it('should encrypt with ENC(...) prefix', () => {
      const enc = new Encryptor('password');
      const plaintext = 'mysecret';

      const encrypted = enc.encryptWithPrefix(plaintext);

      expect(encrypted.startsWith('ENC(')).toBe(true);
      expect(encrypted.endsWith(')')).toBe(true);
      expect(isEncrypted(encrypted)).toBe(true);

      const decrypted = enc.decryptPrefixed(encrypted);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('error handling', () => {
    it('should throw on empty password', () => {
      expect(() => new Encryptor('')).toThrow('Password cannot be empty');
    });

    it('should throw on empty plaintext', () => {
      const enc = new Encryptor('password');
      expect(() => enc.encrypt('')).toThrow('Plaintext cannot be empty');
    });

    it('should throw on empty encoded value', () => {
      const enc = new Encryptor('password');
      expect(() => enc.decrypt('')).toThrow('Encoded value cannot be empty');
    });

    it('should throw on wrong password', () => {
      const enc1 = new Encryptor('correctPassword');
      const enc2 = new Encryptor('wrongPassword');

      const encrypted = enc1.encrypt('secret');

      expect(() => enc2.decrypt(encrypted)).toThrow();
    });
  });

  describe('different encryptions', () => {
    it('should produce different ciphertexts for same plaintext', () => {
      const enc = new Encryptor('password');
      const plaintext = 'same value';

      const encrypted1 = enc.encrypt(plaintext);
      const encrypted2 = enc.encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to same value
      expect(enc.decrypt(encrypted1)).toBe(plaintext);
      expect(enc.decrypt(encrypted2)).toBe(plaintext);
    });
  });

  describe('decryptAllInString', () => {
    it('should decrypt all ENC(...) values in a string', () => {
      const enc = new Encryptor('password');

      const enc1 = enc.encryptWithPrefix('user123');
      const enc2 = enc.encryptWithPrefix('pass456');

      const input = `username=${enc1}\npassword=${enc2}`;
      const result = enc.decryptAllInString(input);

      expect(result).toContain('username=user123');
      expect(result).toContain('password=pass456');
    });
  });

  describe('decryptMap', () => {
    it('should decrypt all ENC(...) values in an object', () => {
      const enc = new Encryptor('password');

      const encryptedPass = enc.encryptWithPrefix('secretPassword');
      const encryptedKey = enc.encryptWithPrefix('apiKey123');

      const config = {
        host: 'localhost',
        port: '5432',
        password: encryptedPass,
        api_key: encryptedKey,
      };

      const decrypted = enc.decryptMap(config);

      expect(decrypted.host).toBe('localhost');
      expect(decrypted.password).toBe('secretPassword');
      expect(decrypted.api_key).toBe('apiKey123');
    });
  });

  describe('custom options', () => {
    it('should work with custom iterations', () => {
      const enc = new Encryptor('password', { iterations: 20000 });

      const plaintext = 'test';
      const encrypted = enc.encrypt(plaintext);
      const decrypted = enc.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });
});

describe('isEncrypted', () => {
  it('should return true for encrypted value', () => {
    expect(isEncrypted('ENC(abc123)')).toBe(true);
  });

  it('should return true for empty ENC', () => {
    expect(isEncrypted('ENC()')).toBe(true);
  });

  it('should return true with spaces', () => {
    expect(isEncrypted('  ENC(value)  ')).toBe(true);
  });

  it('should return false for plaintext', () => {
    expect(isEncrypted('plaintext')).toBe(false);
  });

  it('should return false for missing closing', () => {
    expect(isEncrypted('ENC(missing')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isEncrypted('')).toBe(false);
  });

  it('should return false for null', () => {
    expect(isEncrypted(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isEncrypted(undefined)).toBe(false);
  });
});
