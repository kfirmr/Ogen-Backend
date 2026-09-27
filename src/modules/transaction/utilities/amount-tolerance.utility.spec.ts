import {
  isWithinAmountTolerance,
  getAmountToleranceRange,
} from './amount-tolerance.utility';

describe('isWithinAmountTolerance', () => {
  it('accepts a charge within 15% of the anchor', () => {
    expect(isWithinAmountTolerance('225.00', '199.00')).toBe(true);
  });

  it('rejects a charge far from the anchor', () => {
    expect(isWithinAmountTolerance('12.00', '199.00')).toBe(false);
  });
});

describe('getAmountToleranceRange', () => {
  it('spans 15% either side of the anchor', () => {
    expect(getAmountToleranceRange('200.00')).toEqual({
      min: '170.00',
      max: '230.00',
    });
  });
});
