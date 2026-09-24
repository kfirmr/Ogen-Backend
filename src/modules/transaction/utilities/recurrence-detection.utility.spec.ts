import { detectRecurrence } from './recurrence-detection.utility';
import { TBillingCycle } from '@Modules/subscription/constants/billing-cycle.constant';

const buildCharge = (transactionDate: string, amount = '99.00') => ({
  amount,
  transactionDate,
  currency: 'ILS',
});

describe('detectRecurrence', () => {
  it('detects a monthly subscription across month lengths of 28 to 31 days', () => {
    const result = detectRecurrence([
      buildCharge('2026-01-31'),
      buildCharge('2026-02-28'),
      buildCharge('2026-03-31'),
    ]);

    expect(result).toEqual({
      amount: '99.00',
      currency: 'ILS',
      billingCycle: TBillingCycle.MONTHLY,
    });
  });

  it('detects a weekly cadence', () => {
    const result = detectRecurrence([
      buildCharge('2026-03-01'),
      buildCharge('2026-03-08'),
      buildCharge('2026-03-15'),
    ]);

    expect(result?.billingCycle).toBe(TBillingCycle.WEEKLY);
  });

  it('detects a quarterly cadence', () => {
    const result = detectRecurrence([
      buildCharge('2026-01-10'),
      buildCharge('2026-04-10'),
      buildCharge('2026-07-10'),
    ]);

    expect(result?.billingCycle).toBe(TBillingCycle.QUARTERLY);
  });

  it('sorts charges chronologically and reports the latest amount', () => {
    const result = detectRecurrence([
      buildCharge('2026-03-15', '104.00'),
      buildCharge('2026-01-15', '99.00'),
      buildCharge('2026-02-15', '99.00'),
    ]);

    expect(result).toEqual(
      expect.objectContaining({
        amount: '104.00',
        billingCycle: TBillingCycle.MONTHLY,
      }),
    );
  });

  it('ignores a vendor with fewer charges than the minimum', () => {
    const result = detectRecurrence([
      buildCharge('2026-01-15'),
      buildCharge('2026-02-15'),
    ]);

    expect(result).toBeNull();
  });

  it('ignores monthly-spaced charges whose amounts vary like everyday shopping', () => {
    const result = detectRecurrence([
      buildCharge('2026-01-15', '68.11'),
      buildCharge('2026-02-15', '212.40'),
      buildCharge('2026-03-15', '94.30'),
    ]);

    expect(result).toBeNull();
  });

  it('ignores steady amounts charged at an irregular interval', () => {
    const result = detectRecurrence([
      buildCharge('2026-01-03'),
      buildCharge('2026-01-20'),
      buildCharge('2026-03-02'),
    ]);

    expect(result).toBeNull();
  });

  it('ignores two charges on the same day', () => {
    const result = detectRecurrence([
      buildCharge('2026-01-15'),
      buildCharge('2026-01-15'),
      buildCharge('2026-02-15'),
    ]);

    expect(result).toBeNull();
  });
});
