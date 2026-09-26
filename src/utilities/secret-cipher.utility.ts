import { SECRET_CIPHER } from '@Constants/encryption';
import { createCipheriv, randomBytes, createDecipheriv } from 'crypto';

interface ISecretContext {
  key: Buffer;
  associatedData: string;
}

// Format: v1:<iv>:<authTag>:<ciphertext>, each part base64. The worker repository decrypts with
// the same key and associated data, so this format is a cross-service contract.
export const encryptSecret = (
  plaintext: string,
  context: ISecretContext,
): string => {
  const iv = randomBytes(SECRET_CIPHER.IV_BYTES);
  const cipher = createCipheriv(SECRET_CIPHER.ALGORITHM, context.key, iv, {
    authTagLength: SECRET_CIPHER.AUTH_TAG_BYTES,
  });

  cipher.setAAD(Buffer.from(context.associatedData));

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const encodedParts = [iv, cipher.getAuthTag(), ciphertext].map((part) =>
    part.toString(SECRET_CIPHER.ENCODING),
  );

  return [SECRET_CIPHER.VERSION, ...encodedParts].join(SECRET_CIPHER.SEPARATOR);
};

export const decryptSecret = (
  encrypted: string,
  context: ISecretContext,
): string => {
  const [version, ...encodedParts] = encrypted.split(SECRET_CIPHER.SEPARATOR);
  const isSupportedFormat =
    version === SECRET_CIPHER.VERSION && encodedParts.length === 3;

  if (!isSupportedFormat) {
    throw new Error('Unsupported secret format');
  }

  const [iv, authTag, ciphertext] = encodedParts.map((part) =>
    Buffer.from(part, SECRET_CIPHER.ENCODING),
  );

  const decipher = createDecipheriv(SECRET_CIPHER.ALGORITHM, context.key, iv, {
    authTagLength: SECRET_CIPHER.AUTH_TAG_BYTES,
  });

  decipher.setAAD(Buffer.from(context.associatedData));
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString('utf8');
};

export const parseSecretKey = (encodedKey: string): Buffer => {
  const key = Buffer.from(encodedKey, SECRET_CIPHER.ENCODING);

  if (key.length !== SECRET_CIPHER.KEY_BYTES) {
    throw new Error(
      `Secret key must decode to ${SECRET_CIPHER.KEY_BYTES} bytes of base64`,
    );
  }

  return key;
};
