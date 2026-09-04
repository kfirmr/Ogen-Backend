import { hasStandingOrderMarker } from './standing-order.utility';

describe('hasStandingOrderMarker', () => {
  it('detects the הו"ק suffix with a straight quote', () => {
    expect(hasStandingOrderMarker('ספייס גבעתיים-הו"ק')).toBe(true);
  });

  it('detects the הו״ק suffix with a Hebrew gershayim', () => {
    expect(hasStandingOrderMarker('ספייס גבעתיים-הו״ק')).toBe(true);
  });

  it('detects the spelled-out הוראת קבע phrase', () => {
    expect(hasStandingOrderMarker('LIME*RIDE IGC2 הוראת קבע')).toBe(true);
  });

  it('returns false for a description without a standing-order marker', () => {
    expect(hasStandingOrderMarker('קרוספיט אימפולסו')).toBe(false);
  });
});
