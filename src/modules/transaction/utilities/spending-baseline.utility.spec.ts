import { computeSpendingBaseline } from './spending-baseline.utility';

describe('spending-baseline.utility', () => {
  describe('computeSpendingBaseline', () => {
    it('returns a zeroed baseline for no amounts', () => {
      expect(computeSpendingBaseline([])).toEqual({ average: 0, count: 0 });
    });

    it('averages the given amounts', () => {
      expect(computeSpendingBaseline(['10.00', '20.00', '30.00'])).toEqual({
        average: 20,
        count: 3,
      });
    });

    it('handles a single amount', () => {
      expect(computeSpendingBaseline(['49.90'])).toEqual({
        average: 49.9,
        count: 1,
      });
    });
  });
});
