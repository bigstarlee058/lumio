import { encryptText, decryptText } from '@/common/utils/encryption.util';

describe('encryption.util', () => {
  describe('encryptText', () => {
    it('encrypts a plain text string', () => {
      const result = encryptText('hello');
      expect(result).toMatch(/^enc:/);
      expect(result).not.toBe('hello');
    });

    it('returns same value if already encrypted', () => {
      const encrypted = encryptText('secret data');
      const doubleEncrypted = encryptText(encrypted);
      expect(doubleEncrypted).toBe(encrypted);
    });

    it('returns empty/falsy values as-is', () => {
      expect(encryptText('')).toBe('');
      expect(encryptText(null as any)).toBe(null);
      expect(encryptText(undefined as any)).toBe(undefined);
    });

    it('produces different ciphertexts for same plaintext (random IV)', () => {
      const a = encryptText('same text');
      const b = encryptText('same text');
      expect(a).not.toBe(b); // different IVs → different output
    });
  });

  describe('decryptText', () => {
    it('decrypts an encrypted string back to original', () => {
      const original = 'my secret token 123!@#';
      const encrypted = encryptText(original);
      const decrypted = decryptText(encrypted);
      expect(decrypted).toBe(original);
    });

    it('returns non-encrypted strings as-is', () => {
      expect(decryptText('plain text')).toBe('plain text');
    });

    it('returns empty/falsy values as-is', () => {
      expect(decryptText('')).toBe('');
      expect(decryptText(null as any)).toBe(null);
    });

    it('returns original value if payload is too short', () => {
      const badValue = 'enc:dG9vc2hvcnQ='; // too short base64
      expect(decryptText(badValue)).toBe(badValue);
    });

    it('returns original value if decryption fails (corrupted data)', () => {
      const corrupted = 'enc:' + Buffer.alloc(50).toString('base64');
      expect(decryptText(corrupted)).toBe(corrupted);
    });
  });

  describe('roundtrip', () => {
    it.each([
      'simple text',
      'unicode: привет мир 你好',
      'special chars: !@#$%^&*()',
      'a'.repeat(1000),
      'multiline\ntext\nhere',
    ])('encrypts and decrypts: %s', (input) => {
      expect(decryptText(encryptText(input))).toBe(input);
    });
  });
});
