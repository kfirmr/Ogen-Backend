import {
  collectSubscriptionIds,
  findOrphanedSubscriptionIds,
} from './connection-purge.utility';

describe('collectSubscriptionIds', () => {
  it('lists each linked subscription once and skips unlinked charges', () => {
    expect(
      collectSubscriptionIds([
        { subscriptionId: 'subscription-gym' },
        { subscriptionId: null },
        { subscriptionId: 'subscription-gym' },
        { subscriptionId: 'subscription-netflix' },
      ]),
    ).toEqual(['subscription-gym', 'subscription-netflix']);
  });
});

describe('findOrphanedSubscriptionIds', () => {
  it('keeps a subscription still billed on another account', () => {
    expect(
      findOrphanedSubscriptionIds(
        ['subscription-gym', 'subscription-netflix'],
        ['subscription-netflix'],
      ),
    ).toEqual(['subscription-gym']);
  });
});
