import { TIME_UNITS } from '@Constants/date';

export const AUTH_MESSAGES = {
  INVALID_CREDENTIALS: 'Email or password is incorrect',
} as const;

export const AUTH_ATTEMPT_LIMITS = {
  LOGIN: 10,
  SIGN_UP: 5,
} as const;

export const DEFAULT_TOKEN_EXPIRY_SECONDS =
  (7 * TIME_UNITS.DAYS) / TIME_UNITS.SECONDS;
