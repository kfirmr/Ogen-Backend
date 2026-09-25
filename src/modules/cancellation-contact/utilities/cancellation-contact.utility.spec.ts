import { toCancellationContact } from './cancellation-contact.utility';
import { TCancellationMethod } from '@Modules/vendor/constants/cancellation-method.constant';

const buildRecorded = (overrides = {}) => ({
  url: null,
  email: null,
  phone: null,
  sourceUrl: 'https://impulso.co.il/terms',
  method: TCancellationMethod.EMAIL,
  ...overrides,
});

describe('toCancellationContact', () => {
  it('keeps an email contact that has its address', () => {
    const result = toCancellationContact(
      buildRecorded({ email: 'info@impulso.co.il' }),
    );

    expect(result).toEqual(
      expect.objectContaining({
        method: TCancellationMethod.EMAIL,
        email: 'info@impulso.co.il',
      }),
    );
  });

  it('drops a method whose channel was not actually found', () => {
    expect(toCancellationContact(buildRecorded())).toBeNull();
    expect(
      toCancellationContact(buildRecorded({ method: TCancellationMethod.WEB })),
    ).toBeNull();
  });

  it('accepts an in-app cancellation without a link', () => {
    const result = toCancellationContact(
      buildRecorded({ method: TCancellationMethod.IN_APP }),
    );

    expect(result?.method).toBe(TCancellationMethod.IN_APP);
  });

  it('returns null when nothing was recorded or no method was found', () => {
    expect(toCancellationContact(null)).toBeNull();
    expect(toCancellationContact(buildRecorded({ method: null }))).toBeNull();
  });
});
