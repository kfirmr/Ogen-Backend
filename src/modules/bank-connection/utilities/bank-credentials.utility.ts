import {
  LOGIN_HINT_LENGTHS,
  BANK_CREDENTIAL_FIELDS,
  REQUIRED_CREDENTIAL_FIELDS_BY_COMPANY,
} from '../constants/bank-credential-fields.constant';

import { TBankCompany } from '../constants/bank-company.constant';
import { IBankLoginHint } from '../interfaces/bank-connection.interface';

const hasCredentialValue = (value?: unknown): value is string => {
  if (typeof value !== 'string') {
    return false;
  }

  return value.trim() !== '';
};

export const findMissingCredentialFields = (
  company: TBankCompany,
  credentials: Record<string, unknown>,
): string[] =>
  REQUIRED_CREDENTIAL_FIELDS_BY_COMPANY[company].filter(
    (field) => !hasCredentialValue(credentials[field]),
  );

// Only the fields the company's scraper reads are kept, so nothing extra a client sends is ever
// encrypted and stored alongside the login.
export const pickCompanyCredentials = (
  company: TBankCompany,
  credentials: Record<string, string>,
): Record<string, string> =>
  Object.fromEntries(
    REQUIRED_CREDENTIAL_FIELDS_BY_COMPANY[company].map((field) => [
      field,
      credentials[field].trim(),
    ]),
  );

const takeLast = (length: number, value?: string | null): string | null =>
  value == null ? null : value.slice(-length);

const takeFirst = (length: number, value?: string | null): string | null =>
  value == null ? null : value.slice(0, length);

export const buildLoginHint = (
  credentials: Record<string, string>,
): IBankLoginHint => {
  const username =
    credentials[BANK_CREDENTIAL_FIELDS.USERNAME] ??
    credentials[BANK_CREDENTIAL_FIELDS.USER_CODE] ??
    credentials[BANK_CREDENTIAL_FIELDS.EMAIL];

  return {
    idLastDigits: takeLast(
      LOGIN_HINT_LENGTHS.ID_LAST_DIGITS,
      credentials[BANK_CREDENTIAL_FIELDS.ID],
    ),
    cardLastDigits: takeLast(
      LOGIN_HINT_LENGTHS.CARD_LAST_DIGITS,
      credentials[BANK_CREDENTIAL_FIELDS.CARD_6_DIGITS],
    ),
    usernamePrefix: takeFirst(LOGIN_HINT_LENGTHS.USERNAME_PREFIX, username),
  };
};
