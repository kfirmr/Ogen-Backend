import {
  decryptSecret,
  encryptSecret,
  parseSecretKey,
} from './secret-cipher.utility';

import { randomBytes } from 'crypto';

describe('secret cipher', () => {
  const key = randomBytes(32);
  const context = { key, associatedData: 'user-1' };

  it('round-trips a secret without ever storing it in plaintext', () => {
    const encrypted = encryptSecret('{"password":"hunter2"}', context);

    expect(encrypted).not.toContain('hunter2');
    expect(encrypted.startsWith('v1:')).toBe(true);
    expect(decryptSecret(encrypted, context)).toBe('{"password":"hunter2"}');
  });

  it('produces a different cipher for the same secret every time', () => {
    expect(encryptSecret('secret', context)).not.toBe(
      encryptSecret('secret', context),
    );
  });

  it('refuses a cipher moved to another user', () => {
    const encrypted = encryptSecret('secret', context);

    expect(() =>
      decryptSecret(encrypted, { key, associatedData: 'user-2' }),
    ).toThrow();
  });

  it('refuses a tampered cipher', () => {
    const [version, iv, authTag, ciphertext] = encryptSecret(
      'secret',
      context,
    ).split(':');
    const flippedCiphertext = Buffer.from(ciphertext, 'base64');

    flippedCiphertext[0] ^= 1;

    const tampered = [
      version,
      iv,
      authTag,
      flippedCiphertext.toString('base64'),
    ].join(':');

    expect(() => decryptSecret(tampered, context)).toThrow();
  });

  it('rejects an unknown format', () => {
    expect(() => decryptSecret('plain-text', context)).toThrow(
      'Unsupported secret format',
    );
  });

  it('only accepts a 32-byte base64 key', () => {
    expect(parseSecretKey(key.toString('base64'))).toEqual(key);
    expect(() => parseSecretKey(randomBytes(16).toString('base64'))).toThrow();
  });
});
