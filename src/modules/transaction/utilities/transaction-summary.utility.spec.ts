import { toTransactionSummary } from './transaction-summary.utility';
import { TVendorCategory } from '@Modules/vendor/constants/vendor-category.constant';
import { ISubscription } from '@Modules/subscription/interfaces/subscription.interface';

const NETFLIX_ID = 'b1f0c0de-0000-4000-8000-000000000001';
const GYM_ID = 'b1f0c0de-0000-4000-8000-000000000002';
const DELETED_ID = 'b1f0c0de-0000-4000-8000-000000000003';

const buildSubscription = (id: string) => ({ id }) as ISubscription;

describe('toTransactionSummary', () => {
  it('sorts categories from the largest spend to the smallest', () => {
    const summary = toTransactionSummary({
      chargeRows: [],
      subscriptions: [],
      categoryRows: [
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
      ],
    });

    expect(summary.categories).toEqual([
      { category: TVendorCategory.GROCERIES, amount: '980.10' },
      { category: TVendorCategory.STREAMING, amount: '120.50' },
      { category: null, amount: '45.00' },
    ]);
  });

  it('adds up the non-subscription spend of every category', () => {
    const summary = toTransactionSummary({
      chargeRows: [],
      subscriptions: [],
      categoryRows: [
        {
          amount: '300',
          nonSubscriptionAmount: '250.25',
          category: TVendorCategory.DINING,
        },
        { category: null, amount: '10.1', nonSubscriptionAmount: '10.1' },
      ],
    });

    expect(summary.nonSubscriptionAmount).toBe('260.35');
  });

  it('pairs each charge with its subscription, largest charge first', () => {
    const netflix = buildSubscription(NETFLIX_ID);
    const gym = buildSubscription(GYM_ID);

    const summary = toTransactionSummary({
      categoryRows: [],
      subscriptions: [netflix, gym],
      chargeRows: [
        { subscriptionId: NETFLIX_ID, amount: '69.9' },
        { subscriptionId: GYM_ID, amount: '360' },
      ],
    });

    expect(summary.subscriptionCharges).toEqual([
      { subscription: gym, amount: '360.00' },
      { subscription: netflix, amount: '69.90' },
    ]);
  });

  it("counts a deleted subscription's charge as regular spend", () => {
    const summary = toTransactionSummary({
      subscriptions: [],
      chargeRows: [{ subscriptionId: DELETED_ID, amount: '49.90' }],
      categoryRows: [
        { category: null, amount: '149.90', nonSubscriptionAmount: '100' },
      ],
    });

    expect(summary.subscriptionCharges).toEqual([]);
    expect(summary.nonSubscriptionAmount).toBe('149.90');
  });

  it('returns an empty summary for a month without transactions', () => {
    expect(
      toTransactionSummary({
        chargeRows: [],
        categoryRows: [],
        subscriptions: [],
      }),
    ).toEqual({
      categories: [],
      subscriptionCharges: [],
      nonSubscriptionAmount: '0.00',
    });
  });
});
