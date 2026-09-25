import { TChargeKind } from '../constants/charge-kind.constant';
import { TVendorCategory } from '../constants/vendor-category.constant';
import { isSubscriptionCandidate } from './subscription-eligibility.utility';

describe('isSubscriptionCandidate', () => {
  it('accepts an AI-flagged streaming subscription', () => {
    const result = isSubscriptionCandidate({
      chargeKind: TChargeKind.SUBSCRIPTION,
      category: TVendorCategory.STREAMING,
    });

    expect(result).toBe(true);
  });

  it('accepts a ONE_OFF guess so recurrence can still prove the AI wrong', () => {
    const result = isSubscriptionCandidate({
      chargeKind: TChargeKind.ONE_OFF,
      category: TVendorCategory.FITNESS,
    });

    expect(result).toBe(true);
  });

  it('rejects an essential bill', () => {
    const result = isSubscriptionCandidate({
      chargeKind: TChargeKind.ESSENTIAL_BILL,
      category: TVendorCategory.OTHER,
    });

    expect(result).toBe(false);
  });

  it.each([
    TVendorCategory.UTILITIES,
    TVendorCategory.INSURANCE,
    TVendorCategory.GOVERNMENT,
    TVendorCategory.COMMUNICATION,
    TVendorCategory.GROCERIES,
  ])(
    'rejects the %s category even when the AI tagged it SUBSCRIPTION',
    (category) => {
      const result = isSubscriptionCandidate({
        category,
        chargeKind: TChargeKind.SUBSCRIPTION,
      });

      expect(result).toBe(false);
    },
  );

  it('accepts an unclassified vendor', () => {
    const result = isSubscriptionCandidate({
      chargeKind: null,
      category: null,
    });

    expect(result).toBe(true);
  });
});
