import {
  buildLoginHint,
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

describe('buildLoginHint', () => {
  it('keeps the card and ID tails of a card login, never the password', () => {
    const hint = buildLoginHint({
      id: '123456789',
      card6Digits: '994821',
      password: 'hunter2',
    });

    expect(hint).toEqual({
      idLastDigits: '789',
      cardLastDigits: '4821',
      usernamePrefix: null,
    });
    expect(JSON.stringify(hint)).not.toContain('hunter2');
  });

  it('keeps the first characters of a username login', () => {
    expect(buildLoginHint({ username: 'noa.levi', password: 'x' })).toEqual({
      idLastDigits: null,
      cardLastDigits: null,
      usernamePrefix: 'no',
    });
  });

  it('treats a bank user code as the username', () => {
    expect(buildLoginHint({ userCode: 'AB123', password: 'x' })).toEqual(
      expect.objectContaining({ usernamePrefix: 'AB' }),
    );
  });
});
