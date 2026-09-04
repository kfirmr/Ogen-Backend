import * as XLSX from 'xlsx';
import { parseTransactionRows } from './xlsx-parser.utility';

const HEADERS = [
  'תאריך רכישה',
  'שם בית עסק',
  'סכום עסקה',
  'מטבע עסקה',
  'סכום חיוב',
  'מטבע חיוב',
  "מס' שובר",
  'פירוט נוסף',
];

const buildWorkbookBuffer = (headers: string[], rows: unknown[][]): Buffer => {
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
};

describe('xlsx-parser.utility', () => {
  describe('parseTransactionRows', () => {
    it('parses valid rows using the billed amount/currency columns, defaulting currency when absent', () => {
      const buffer = buildWorkbookBuffer(HEADERS, [
        [
          '2026-01-15',
          'NETFLIX.COM',
          '13.99',
          'USD',
          '49.90',
          'ILS',
          'ext-1',
          'note',
        ],
        ['2026-01-16', 'COFFEE SHOP', '12.50', 'ILS', '12.50', '', '', ''],
      ]);

      const result = parseTransactionRows(buffer);

      expect(result.headerError).toBeNull();
      expect(result.parseErrors).toEqual([]);
      expect(result.rows).toEqual([
        {
          amount: '49.90',
          currency: 'ILS',
          externalId: 'ext-1',
          transactionDate: '2026-01-15',
          originalDescription: 'NETFLIX.COM',
        },
        {
          amount: '12.50',
          currency: 'ILS',
          externalId: undefined,
          transactionDate: '2026-01-16',
          originalDescription: 'COFFEE SHOP',
        },
      ]);
    });

    it('resolves a reworded header from a different card issuer (fuzzy match end-to-end)', () => {
      const rewordedHeaders = [
        'תאריך עסקה',
        'שם בית עסק',
        'סכום חיוב',
        'מטבע חיוב',
      ];
      const buffer = buildWorkbookBuffer(rewordedHeaders, [
        ['2026-01-15', 'NETFLIX.COM', '49.90', 'ILS'],
      ]);

      const result = parseTransactionRows(buffer);

      expect(result.headerError).toBeNull();
      expect(result.rows).toEqual([
        {
          amount: '49.90',
          currency: 'ILS',
          externalId: undefined,
          transactionDate: '2026-01-15',
          originalDescription: 'NETFLIX.COM',
        },
      ]);
    });

    it('fails fast with a headerError instead of per-row errors when required columns cannot be resolved', () => {
      const buffer = buildWorkbookBuffer(
        ['Date', 'Amount', 'Currency', 'Description'],
        [['2026-01-15', '49.90', 'ILS', 'NETFLIX.COM']],
      );

      const result = parseTransactionRows(buffer);

      expect(result.rows).toEqual([]);
      expect(result.parseErrors).toEqual([]);
      expect(result.headerError).not.toBeNull();
    });

    it('collects an error for a missing description instead of throwing', () => {
      const buffer = buildWorkbookBuffer(HEADERS, [
        ['2026-01-15', '', '13.99', 'USD', '49.90', 'ILS', '', ''],
      ]);

      const result = parseTransactionRows(buffer);

      expect(result.headerError).toBeNull();
      expect(result.rows).toEqual([]);
      expect(result.parseErrors).toEqual(['Row 2: missing description']);
    });

    it('collects an error for an unparseable billed amount', () => {
      const buffer = buildWorkbookBuffer(HEADERS, [
        [
          '2026-01-15',
          'NETFLIX.COM',
          '13.99',
          'USD',
          'not-a-number',
          'ILS',
          '',
          '',
        ],
      ]);

      const result = parseTransactionRows(buffer);

      expect(result.rows).toEqual([]);
      expect(result.parseErrors).toEqual([
        'Row 2: unparseable amount "not-a-number"',
      ]);
    });

    it('strips thousand-separator commas from a formatted billed amount', () => {
      const buffer = buildWorkbookBuffer(HEADERS, [
        ['2026-01-15', 'BANK TRANSFER', '3000', 'ILS', '3,000.00', 'ILS', '', ''],
      ]);

      const result = parseTransactionRows(buffer);

      expect(result.parseErrors).toEqual([]);
      expect(result.rows).toEqual([
        {
          amount: '3000.00',
          currency: 'ILS',
          externalId: undefined,
          transactionDate: '2026-01-15',
          originalDescription: 'BANK TRANSFER',
        },
      ]);
    });

    it('collects an error for an unparseable date', () => {
      const buffer = buildWorkbookBuffer(HEADERS, [
        ['not-a-date', 'NETFLIX.COM', '13.99', 'USD', '49.90', 'ILS', '', ''],
      ]);

      const result = parseTransactionRows(buffer);

      expect(result.rows).toEqual([]);
      expect(result.parseErrors).toEqual([
        'Row 2: unparseable date "not-a-date"',
      ]);
    });

    it('returns no rows and no errors for a sheet with only headers', () => {
      const buffer = buildWorkbookBuffer(HEADERS, []);

      const result = parseTransactionRows(buffer);

      expect(result.headerError).toBeNull();
      expect(result.rows).toEqual([]);
      expect(result.parseErrors).toEqual([]);
    });

    it('finds the header row after title/summary rows preceding it', () => {
      const sheet = XLSX.utils.aoa_to_sheet([
        ['פירוט עסקאות', 'ספטמבר 2026'],
        ['מסגרת:', '₪ 7,500'],
        [],
        HEADERS,
        [
          '2026-01-15',
          'NETFLIX.COM',
          '13.99',
          'USD',
          '49.90',
          'ILS',
          'ext-1',
          'note',
        ],
      ]);
      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');

      const buffer = XLSX.write(workbook, {
        type: 'buffer',
        bookType: 'xlsx',
      }) as Buffer;

      const result = parseTransactionRows(buffer);

      expect(result.headerError).toBeNull();
      expect(result.parseErrors).toEqual([]);
      expect(result.rows).toEqual([
        {
          amount: '49.90',
          currency: 'ILS',
          externalId: 'ext-1',
          transactionDate: '2026-01-15',
          originalDescription: 'NETFLIX.COM',
        },
      ]);
    });

    it('parses a dotted day.month.year date as used by Israeli card statements', () => {
      const buffer = buildWorkbookBuffer(HEADERS, [
        ['26.08.26', 'NETFLIX.COM', '13.99', 'USD', '49.90', 'ILS', '', ''],
      ]);

      const result = parseTransactionRows(buffer);

      expect(result.headerError).toBeNull();
      expect(result.parseErrors).toEqual([]);
      expect(result.rows).toEqual([
        {
          amount: '49.90',
          currency: 'ILS',
          externalId: undefined,
          transactionDate: '2026-08-26',
          originalDescription: 'NETFLIX.COM',
        },
      ]);
    });

    it('skips sparse title rows with unpopulated cells while scanning for the header', () => {
      const sheet = XLSX.utils.aoa_to_sheet([
        ['פירוט עסקאות', undefined, undefined, undefined, 'ספטמבר 2026'],
        HEADERS,
        [
          '2026-01-15',
          'NETFLIX.COM',
          '13.99',
          'USD',
          '49.90',
          'ILS',
          'ext-1',
          'note',
        ],
      ]);
      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');

      const buffer = XLSX.write(workbook, {
        type: 'buffer',
        bookType: 'xlsx',
      }) as Buffer;

      const result = parseTransactionRows(buffer);

      expect(result.headerError).toBeNull();
      expect(result.rows).toEqual([
        {
          amount: '49.90',
          currency: 'ILS',
          externalId: 'ext-1',
          transactionDate: '2026-01-15',
          originalDescription: 'NETFLIX.COM',
        },
      ]);
    });
  });
});
