import { normalizeDescription } from './description.utility';

describe('description.utility', () => {
  it('lowercases and collapses whitespace', () => {
    expect(normalizeDescription('  NETFLIX   COM  ')).toBe('netflix com');
  });

  it('strips punctuation used by bank statements', () => {
    expect(normalizeDescription('NETFLIX.COM* 1234-5678')).toBe(
      'netflix com 1234 5678',
    );
  });

  it('keeps hebrew vendor names', () => {
    expect(normalizeDescription('הוט מובייל')).toBe('הוט מובייל');
  });

  it('maps the same vendor written differently to one pattern', () => {
    expect(normalizeDescription('Netflix.com')).toBe(
      normalizeDescription('NETFLIX COM'),
    );
  });
});
