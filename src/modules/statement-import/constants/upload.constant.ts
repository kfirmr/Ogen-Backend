import { TIME_UNITS } from '@Constants/date';

export const STATEMENT_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

export const STATEMENT_UPLOAD_RATE_LIMIT = {
  MAX_PER_DAY: 2,
  WINDOW_MS: TIME_UNITS.DAYS,
} as const;
