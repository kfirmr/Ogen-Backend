import { levenshteinDistance } from './levenshtein-distance.utility';

describe('levenshtein-distance.utility', () => {
  describe('levenshteinDistance', () => {
    it('returns 0 for identical strings', () => {
      expect(levenshteinDistance('netflix', 'netflix')).toBe(0);
    });

    it('returns the classic reference distance', () => {
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
    });

    it('returns the length of the other string when one is empty', () => {
      expect(levenshteinDistance('', 'abc')).toBe(3);
      expect(levenshteinDistance('abc', '')).toBe(3);
    });

    it('counts a single substitution as distance 1', () => {
      expect(levenshteinDistance('cat', 'cot')).toBe(1);
    });

    it('counts a single insertion as distance 1', () => {
      expect(levenshteinDistance('cat', 'cats')).toBe(1);
    });

    it('counts a single deletion as distance 1', () => {
      expect(levenshteinDistance('cats', 'cat')).toBe(1);
    });

    it('handles Hebrew strings', () => {
      expect(levenshteinDistance('תאריך רכישה', 'תאריך עסקה')).toBe(4);
    });
  });
});
