import {
  pickCompanyCredentials,
  findMissingCredentialFields,
} from './bank-credentials.utility';

import { TBankCompany } from '../constants/bank-company.constant';

describe('bank credentials', () => {
  it('lists every required field that is missing or blank', () => {
    expect(
      findMissingCredentialFields(TBankCompany.ISRACARD, {
        id: '123456789',
        card6Digits: '  ',
      }),
    ).toEqual(['card6Digits', 'password']);
  });

  it('accepts a complete login', () => {
    expect(
      findMissingCredentialFields(TBankCompany.HAPOALIM, {
        userCode: 'AB123',
        password: 'secret',
      }),
    ).toEqual([]);
  });

  it('keeps only the fields the company scraper reads', () => {
    expect(
      pickCompanyCredentials(TBankCompany.LEUMI, {
        username: ' michal ',
        password: 'secret',
        rememberMe: 'true',
      }),
    ).toEqual({ username: 'michal', password: 'secret' });
  });
});
