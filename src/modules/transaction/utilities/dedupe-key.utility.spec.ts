import { buildDedupeKey } from './dedupe-key.utility';

describe('buildDedupeKey', () => {
  it('matches a parsed amount to the same amount as stored with two decimals', () => {
    expect(buildDedupeKey('2026-08-15', '69.9')).toBe(
      buildDedupeKey('2026-08-15', '69.90'),
    );
    expect(buildDedupeKey('2026-08-15', '270')).toBe('2026-08-15|270.00');
  });

  it('keeps different amounts on the same day apart', () => {
    expect(buildDedupeKey('2026-08-15', '69.90')).not.toBe(
      buildDedupeKey('2026-08-15', '69.99'),
    );
  });
});
