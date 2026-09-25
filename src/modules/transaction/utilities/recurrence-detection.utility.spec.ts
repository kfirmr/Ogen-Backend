import { detectRecurrence } from './recurrence-detection.utility';
import { RECURRENCE_THRESHOLDS } from '../constants/recurrence-detection.constant';
import { TBillingCycle } from '@Modules/subscription/constants/billing-cycle.constant';

const UNFLAGGED_REQUIRED_CHARGES =
  RECURRENCE_THRESHOLDS.REQUIRED_CHARGES.UNFLAGGED;
const AI_FLAGGED_REQUIRED_CHARGES =
  RECURRENCE_THRESHOLDS.REQUIRED_CHARGES.AI_FLAGGED;

const buildCharge = (transactionDate: string, amount = '99.00') => ({
  amount,
  transactionDate,
  currency: 'ILS',
});

describe('detectRecurrence', () => {
  it('detects a monthly subscription across month lengths of 28 to 31 days', () => {
    const result = detectRecurrence(
      [
        buildCharge('2026-01-31'),
        buildCharge('2026-02-28'),
        buildCharge('2026-03-31'),
      ],
      UNFLAGGED_REQUIRED_CHARGES,
    );

    expect(result).toEqual({
      amount: '99.00',
      currency: 'ILS',
      billingCycle: TBillingCycle.MONTHLY,
    });
  });

  it('detects a weekly cadence', () => {
    const result = detectRecurrence(
      [
        buildCharge('2026-03-01'),
        buildCharge('2026-03-08'),
        buildCharge('2026-03-15'),
      ],
      UNFLAGGED_REQUIRED_CHARGES,
    );

    expect(result?.billingCycle).toBe(TBillingCycle.WEEKLY);
  });

  it('detects a quarterly cadence', () => {
    const result = detectRecurrence(
      [
        buildCharge('2026-01-10'),
        buildCharge('2026-04-10'),
        buildCharge('2026-07-10'),
      ],
      UNFLAGGED_REQUIRED_CHARGES,
    );

    expect(result?.billingCycle).toBe(TBillingCycle.QUARTERLY);
  });

  it('sorts charges chronologically and reports the latest amount', () => {
    const result = detectRecurrence(
      [
        buildCharge('2026-03-15', '104.00'),
        buildCharge('2026-01-15', '99.00'),
        buildCharge('2026-02-15', '99.00'),
      ],
      UNFLAGGED_REQUIRED_CHARGES,
    );

    expect(result).toEqual(
      expect.objectContaining({
        amount: '104.00',
        billingCycle: TBillingCycle.MONTHLY,
      }),
    );
  });

  it('ignores a vendor with fewer charges than the minimum when the amounts differ', () => {
    const result = detectRecurrence(
      [buildCharge('2026-01-15', '99.00'), buildCharge('2026-02-15', '104.00')],
      UNFLAGGED_REQUIRED_CHARGES,
    );

    expect(result).toBeNull();
  });

  it('confirms two identical charges on the same billing day even without an AI flag', () => {
    const result = detectRecurrence(
      [
        buildCharge('2026-07-15', '270.00'),
        buildCharge('2026-08-15', '270.00'),
      ],
      UNFLAGGED_REQUIRED_CHARGES,
    );

    expect(result).toEqual({
      amount: '270.00',
      currency: 'ILS',
      billingCycle: TBillingCycle.MONTHLY,
    });
  });

  it('rejects two identical charges whose billing day drifts like a habit, not a plan', () => {
    const result = detectRecurrence(
      [buildCharge('2026-07-10', '60.00'), buildCharge('2026-08-14', '60.00')],
      UNFLAGGED_REQUIRED_CHARGES,
    );

    expect(result).toBeNull();
  });

  it('keeps the full tolerance once there are enough charges for the regular bar', () => {
    const result = detectRecurrence(
      [
        buildCharge('2026-06-10', '60.00'),
        buildCharge('2026-07-14', '60.00'),
        buildCharge('2026-08-12', '60.00'),
      ],
      UNFLAGGED_REQUIRED_CHARGES,
    );

    expect(result?.billingCycle).toBe(TBillingCycle.MONTHLY);
  });

  it('rejects a habit whose gaps average a month but swing too widely, like a haircut', () => {
    const result = detectRecurrence(
      [
        buildCharge('2026-06-14', '60.00'),
        buildCharge('2026-07-10', '60.00'),
        buildCharge('2026-08-14', '60.00'),
      ],
      UNFLAGGED_REQUIRED_CHARGES,
    );

    expect(result).toBeNull();
  });

  it('tolerates a fixed billing day shifted by a weekend across uneven months', () => {
    const result = detectRecurrence(
      [
        buildCharge('2026-01-15'),
        buildCharge('2026-02-16'),
        buildCharge('2026-03-15'),
        buildCharge('2026-04-15'),
      ],
      UNFLAGGED_REQUIRED_CHARGES,
    );

    expect(result?.billingCycle).toBe(TBillingCycle.MONTHLY);
  });

  it('detects the plan charge despite incidental purchases at the same vendor', () => {
    const result = detectRecurrence(
      [
        buildCharge('2026-06-15', '270.00'),
        buildCharge('2026-06-28', '4.00'),
        buildCharge('2026-07-05', '12.00'),
        buildCharge('2026-07-15', '270.00'),
        buildCharge('2026-08-15', '270.00'),
      ],
      UNFLAGGED_REQUIRED_CHARGES,
    );

    expect(result).toEqual({
      amount: '270.00',
      currency: 'ILS',
      billingCycle: TBillingCycle.MONTHLY,
    });
  });

  it('ignores monthly-spaced charges whose amounts vary like everyday shopping', () => {
    const result = detectRecurrence(
      [
        buildCharge('2026-01-15', '68.11'),
        buildCharge('2026-02-15', '212.40'),
        buildCharge('2026-03-15', '94.30'),
      ],
      UNFLAGGED_REQUIRED_CHARGES,
    );

    expect(result).toBeNull();
  });

  it('ignores steady amounts charged at an irregular interval', () => {
    const result = detectRecurrence(
      [
        buildCharge('2026-01-03'),
        buildCharge('2026-01-20'),
        buildCharge('2026-03-02'),
      ],
      UNFLAGGED_REQUIRED_CHARGES,
    );

    expect(result).toBeNull();
  });

  it('ignores two charges on the same day', () => {
    const result = detectRecurrence(
      [
        buildCharge('2026-01-15'),
        buildCharge('2026-01-15'),
        buildCharge('2026-02-15'),
      ],
      UNFLAGGED_REQUIRED_CHARGES,
    );

    expect(result).toBeNull();
  });

  it('confirms an AI-flagged subscription from two similar charges one cycle apart', () => {
    const result = detectRecurrence(
      [buildCharge('2026-01-15', '99.00'), buildCharge('2026-02-18', '104.00')],
      AI_FLAGGED_REQUIRED_CHARGES,
    );

    expect(result?.billingCycle).toBe(TBillingCycle.MONTHLY);
  });

  it('never confirms a cadence from a single charge, whatever the required count', () => {
    const result = detectRecurrence([buildCharge('2026-01-15')], 1);

    expect(result).toBeNull();
  });

  it('rejects a bimonthly utility-style cadence', () => {
    const result = detectRecurrence(
      [
        buildCharge('2026-01-10', '164.87'),
        buildCharge('2026-03-10', '171.20'),
        buildCharge('2026-05-10', '158.40'),
      ],
      UNFLAGGED_REQUIRED_CHARGES,
    );

    expect(result).toBeNull();
  });
});
