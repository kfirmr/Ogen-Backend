import { Vendor } from '@Modules/vendor/entities/vendor.entity';
import { isOverpayingVendor } from './overpaying-detection.utility';

const buildVendor = (overrides: Partial<Vendor> = {}) =>
  ({
    id: 'a5f0c0de-0000-4000-8000-000000000030',
    name: 'Netflix',
    currency: 'ILS',
    averageMarketPrice: '39.90',
    ...overrides,
  }) as Vendor;

describe('overpaying-detection.utility', () => {
  describe('isOverpayingVendor', () => {
    it('returns false when the vendor has no market price', () => {
      const vendor = buildVendor({ averageMarketPrice: null });

      expect(isOverpayingVendor('60.00', 'ILS', vendor)).toBe(false);
    });

    it('returns false when the currencies do not match', () => {
      const vendor = buildVendor({ currency: 'USD' });

      expect(isOverpayingVendor('60.00', 'ILS', vendor)).toBe(false);
    });

    it('returns false when the amount is at the threshold', () => {
      const vendor = buildVendor({ averageMarketPrice: '10.00' });

      expect(isOverpayingVendor('13.00', 'ILS', vendor)).toBe(false);
    });

    it('returns true when the amount clears the threshold', () => {
      const vendor = buildVendor({ averageMarketPrice: '10.00' });

      expect(isOverpayingVendor('13.01', 'ILS', vendor)).toBe(true);
    });
  });
});
