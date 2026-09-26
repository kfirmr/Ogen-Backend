import { TBankCompany } from '../constants/bank-company.constant';
import { REQUIRED_CREDENTIAL_FIELDS_BY_COMPANY } from '../constants/bank-credential-fields.constant';

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
