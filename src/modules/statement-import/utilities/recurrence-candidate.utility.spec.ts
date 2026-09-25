import {
  pickLatestCharge,
  toRecurringCharge,
  getRequiredChargeCount,
} from './recurrence-candidate.utility';

import { TChargeKind } from '@Modules/vendor/constants/charge-kind.constant';
import { RECURRENCE_THRESHOLDS } from '@Modules/transaction/constants/recurrence-detection.constant';

const buildCharge = (transactionDate: string) => ({
  transactionDate,
  amount: '99.00',
  currency: 'ILS',
});

describe('getRequiredChargeCount', () => {
  it('lowers the bar for an AI-flagged subscription', () => {
    const result = getRequiredChargeCount({
      chargeKind: TChargeKind.SUBSCRIPTION,
    });

    expect(result).toBe(RECURRENCE_THRESHOLDS.REQUIRED_CHARGES.AI_FLAGGED);
  });

  it('requires the full bar for any other vendor', () => {
    const result = getRequiredChargeCount({ chargeKind: TChargeKind.ONE_OFF });

    expect(result).toBe(RECURRENCE_THRESHOLDS.REQUIRED_CHARGES.UNFLAGGED);
  });
});

describe('pickLatestCharge', () => {
  it('takes the next charge when there is no current one', () => {
    const next = buildCharge('2026-02-15');

    expect(pickLatestCharge(null, next)).toBe(next);
  });

  it('keeps whichever charge is later', () => {
    const earlier = buildCharge('2026-01-15');
    const later = buildCharge('2026-02-15');

    expect(pickLatestCharge(later, earlier)).toBe(later);
    expect(pickLatestCharge(earlier, later)).toBe(later);
  });
});

describe('toRecurringCharge', () => {
  it('falls back to the default currency when the row has none', () => {
    const result = toRecurringCharge({
      amount: '99.00',
      transactionDate: '2026-01-15',
      originalDescription: 'GYM CLUB',
    });

    expect(result).toEqual({
      amount: '99.00',
      currency: 'ILS',
      transactionDate: '2026-01-15',
    });
  });
});
