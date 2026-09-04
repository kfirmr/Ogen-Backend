import {
  isRedundantServiceType,
  buildRedundantServiceGroup,
} from './redundant-service-detection.utility';

import { TServiceType } from '@Modules/vendor/constants/service-type.constant';
import { Subscription } from '@Modules/subscription/entities/subscription.entity';

const buildSubscription = (id: string, vendorName: string, createdAt: string) =>
  ({
    id,
    createdAt: new Date(createdAt),
    vendor: { name: vendorName },
  }) as Subscription;

describe('redundant-service-detection.utility', () => {
  describe('isRedundantServiceType', () => {
    it('returns false when the vendor has no service type', () => {
      expect(isRedundantServiceType(null)).toBe(false);
    });

    it('returns false for NONE', () => {
      expect(isRedundantServiceType(TServiceType.NONE)).toBe(false);
    });

    it('returns true for an interchangeable service', () => {
      expect(isRedundantServiceType(TServiceType.VIDEO_STREAMING)).toBe(true);
    });
  });

  describe('buildRedundantServiceGroup', () => {
    it('returns null for a single active subscription', () => {
      const subscriptions = [
        buildSubscription('b', 'Netflix', '2026-08-02T00:00:00.000Z'),
      ];

      expect(buildRedundantServiceGroup(subscriptions)).toBeNull();
    });

    it('anchors the group on the oldest subscription', () => {
      const subscriptions = [
        buildSubscription('b', 'Disney+', '2026-08-02T00:00:00.000Z'),
        buildSubscription('a', 'Netflix', '2026-08-01T00:00:00.000Z'),
      ];

      const group = buildRedundantServiceGroup(subscriptions);

      expect(group?.anchorSubscriptionId).toBe('a');
      expect(group?.subscriptionIds).toEqual(['a', 'b']);
      expect(group?.vendorNames).toEqual(['Netflix', 'Disney+']);
    });

    it('breaks a creation-time tie by id so the anchor is stable', () => {
      const subscriptions = [
        buildSubscription('b', 'Disney+', '2026-08-01T00:00:00.000Z'),
        buildSubscription('a', 'Netflix', '2026-08-01T00:00:00.000Z'),
      ];

      expect(
        buildRedundantServiceGroup(subscriptions)?.anchorSubscriptionId,
      ).toBe('a');
    });

    it('collapses repeated vendor names into a single name', () => {
      const subscriptions = [
        buildSubscription('a', 'Netflix', '2026-08-01T00:00:00.000Z'),
        buildSubscription('b', 'Netflix', '2026-08-02T00:00:00.000Z'),
      ];

      expect(buildRedundantServiceGroup(subscriptions)?.vendorNames).toEqual([
        'Netflix',
      ]);
    });
  });
});
