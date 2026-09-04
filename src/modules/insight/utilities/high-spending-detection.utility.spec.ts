import {
  isVendorSpendingSpike,
  isLargeOneOffPurchase,
} from './high-spending-detection.utility';

describe('high-spending-detection.utility', () => {
  describe('isVendorSpendingSpike', () => {
    it('returns false when there is not enough vendor history', () => {
      expect(isVendorSpendingSpike('100', { average: 50, count: 2 })).toBe(
        false,
      );
    });

    it('returns false when the amount is within the normal range', () => {
      expect(isVendorSpendingSpike('60', { average: 50, count: 5 })).toBe(
        false,
      );
    });

    it('returns true when the amount clears the spike ratio', () => {
      expect(isVendorSpendingSpike('76', { average: 50, count: 5 })).toBe(true);
    });
  });

  describe('isLargeOneOffPurchase', () => {
    it('returns false when there is not enough overall history', () => {
      expect(isLargeOneOffPurchase('500', { average: 50, count: 3 })).toBe(
        false,
      );
    });

    it('returns false when the amount is within the normal range', () => {
      expect(isLargeOneOffPurchase('100', { average: 50, count: 5 })).toBe(
        false,
      );
    });

    it('returns true when the amount clears the large-purchase ratio', () => {
      expect(isLargeOneOffPurchase('151', { average: 50, count: 5 })).toBe(
        true,
      );
    });
  });
});
