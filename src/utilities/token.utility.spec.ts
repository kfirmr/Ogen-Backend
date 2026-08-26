import { extractBearerToken } from './token.utility';

describe('token.utility', () => {
  it('extracts the token from a bearer header', () => {
    expect(extractBearerToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
  });

  it('accepts a lowercase scheme', () => {
    expect(extractBearerToken('bearer abc.def.ghi')).toBe('abc.def.ghi');
  });

  it('returns null for a missing header', () => {
    expect(extractBearerToken(null)).toBeNull();
  });

  it('returns null for a non-bearer scheme', () => {
    expect(extractBearerToken('Basic abc.def.ghi')).toBeNull();
  });

  it('returns null when the token is empty', () => {
    expect(extractBearerToken('Bearer ')).toBeNull();
  });
});
