import { hashPassword, isPasswordMatching } from './password.utility';

describe('password.utility', () => {
  const password = 'correct-horse-battery';

  it('produces a salted hash that never equals the password', () => {
    const passwordHash = hashPassword(password);

    expect(passwordHash).not.toContain(password);
    expect(passwordHash.split(':')).toHaveLength(2);
  });

  it('produces a different hash for the same password', () => {
    expect(hashPassword(password)).not.toEqual(hashPassword(password));
  });

  it('matches the original password', () => {
    expect(isPasswordMatching(password, hashPassword(password))).toBe(true);
  });

  it('rejects a wrong password', () => {
    expect(isPasswordMatching('wrong-password', hashPassword(password))).toBe(
      false,
    );
  });

  it('rejects a malformed hash instead of throwing', () => {
    expect(isPasswordMatching(password, 'not-a-real-hash')).toBe(false);
  });
});
