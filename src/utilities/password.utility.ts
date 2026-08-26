import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const SALT_BYTES = 16;
const KEY_BYTES = 32;
const SEPARATOR = ':';

export const hashPassword = (password: string): string => {
  const salt = randomBytes(SALT_BYTES).toString('hex');
  const derivedKey = scryptSync(password, salt, KEY_BYTES).toString('hex');

  return `${salt}${SEPARATOR}${derivedKey}`;
};

export const isPasswordMatching = (
  password: string,
  passwordHash: string,
): boolean => {
  const [salt, storedKey] = passwordHash.split(SEPARATOR);

  if (!salt || !storedKey) {
    return false;
  }

  const derivedKey = scryptSync(password, salt, KEY_BYTES);
  const storedBuffer = Buffer.from(storedKey, 'hex');

  if (storedBuffer.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(derivedKey, storedBuffer);
};
