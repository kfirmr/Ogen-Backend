import { toTransactionSummary } from './transaction-summary.utility';
import { TVendorCategory } from '@Modules/vendor/constants/vendor-category.constant';

describe('toTransactionSummary', () => {
  it('sorts categories from the largest spend to the smallest', () => {
    const summary = toTransactionSummary([
      {
        amount: '120.5',
        nonSubscriptionAmount: '0',
        category: TVendorCategory.STREAMING,
      },
      {
        amount: '980.1',
        nonSubscriptionAmount: '980.1',
        category: TVendorCategory.GROCERIES,
      },
      { category: null, amount: '45', nonSubscriptionAmount: '45' },
    ]);

    expect(summary.categories).toEqual([
      { category: TVendorCategory.GROCERIES, amount: '980.10' },
      { category: TVendorCategory.STREAMING, amount: '120.50' },
      { category: null, amount: '45.00' },
    ]);
  });

  it('adds up the non-subscription spend of every category', () => {
    const summary = toTransactionSummary([
      {
        amount: '300',
        nonSubscriptionAmount: '250.25',
        category: TVendorCategory.DINING,
      },
      {
        amount: '99.9',
        nonSubscriptionAmount: '0',
        category: TVendorCategory.STREAMING,
      },
      { category: null, amount: '10.1', nonSubscriptionAmount: '10.1' },
    ]);

    expect(summary.nonSubscriptionAmount).toBe('260.35');
  });

  it('returns an empty summary for a month without transactions', () => {
    expect(toTransactionSummary([])).toEqual({
      categories: [],
      nonSubscriptionAmount: '0.00',
    });
  });
});
