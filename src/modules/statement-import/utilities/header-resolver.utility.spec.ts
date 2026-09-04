import { resolveColumnHeaders } from './header-resolver.utility';

describe('header-resolver.utility', () => {
  describe('resolveColumnHeaders', () => {
    it('resolves every field from the exact real header row', () => {
      const rawHeaders = [
        'תאריך רכישה',
        'שם בית עסק',
        'סכום עסקה',
        'מטבע עסקה',
        'סכום חיוב',
        'מטבע חיוב',
        "מס' שובר",
        'פירוט נוסף',
      ];

      const result = resolveColumnHeaders(rawHeaders);

      expect(result.missingRequiredFields).toEqual([]);
      expect(result.headerByField).toEqual(
        expect.objectContaining({
          DATE: 'תאריך רכישה',
          DESCRIPTION: 'שם בית עסק',
          AMOUNT: 'סכום חיוב',
          CURRENCY: 'מטבע חיוב',
          EXTERNAL_ID: "מס' שובר",
        }),
      );
    });

    it('fuzzy-matches a reworded date header from a different card issuer', () => {
      const rawHeaders = ['תאריך עסקה', 'שם בית עסק', 'סכום חיוב', 'מטבע חיוב'];

      const result = resolveColumnHeaders(rawHeaders);

      expect(result.missingRequiredFields).toEqual([]);
      expect(result.headerByField.DATE).toBe('תאריך עסקה');
    });

    it('reports a missing required field when the description column is absent', () => {
      const rawHeaders = ['תאריך רכישה', 'סכום חיוב', 'מטבע חיוב'];

      const result = resolveColumnHeaders(rawHeaders);

      expect(result.missingRequiredFields).toContain('DESCRIPTION');
    });

    it('never resolves AMOUNT to the transaction-currency column when both are present', () => {
      const rawHeaders = [
        'תאריך רכישה',
        'שם בית עסק',
        'סכום עסקה',
        'סכום חיוב',
        'מטבע חיוב',
      ];

      const result = resolveColumnHeaders(rawHeaders);

      expect(result.headerByField.AMOUNT).toBe('סכום חיוב');
    });

    it('fails closed for an unrelated header set instead of false-matching across scripts', () => {
      const rawHeaders = ['Date', 'Amount', 'Currency', 'Description'];

      const result = resolveColumnHeaders(rawHeaders);

      expect(result.missingRequiredFields.length).toBeGreaterThan(0);
    });
  });
});
