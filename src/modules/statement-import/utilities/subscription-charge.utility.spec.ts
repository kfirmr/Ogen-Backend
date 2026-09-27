import { resolveChargedSubscriptionId } from './subscription-charge.utility';

const GYM_MEMBERSHIP = { id: 'subscription-gym', amount: '199.00' };

describe('resolveChargedSubscriptionId', () => {
  it('links a charge at the plan price to the subscription', () => {
    expect(resolveChargedSubscriptionId('199.00', GYM_MEMBERSHIP)).toBe(
      'subscription-gym',
    );
  });

  it('leaves a small purchase at the same vendor as regular spend', () => {
    expect(resolveChargedSubscriptionId('12.00', GYM_MEMBERSHIP)).toBeNull();
  });

  it('links nothing for a vendor without an active subscription', () => {
    expect(resolveChargedSubscriptionId('199.00', null)).toBeNull();
  });
});
