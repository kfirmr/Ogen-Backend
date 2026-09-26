export const SECRET_CIPHER = {
  ALGORITHM: 'aes-256-gcm',
  KEY_BYTES: 32,
  IV_BYTES: 12,
  AUTH_TAG_BYTES: 16,
  VERSION: 'v1',
  SEPARATOR: ':',
  ENCODING: 'base64',
} as const;

export const ENCRYPTION_ENV_KEYS = {
  CREDENTIALS_KEY: 'CREDENTIALS_ENCRYPTION_KEY',
} as const;
