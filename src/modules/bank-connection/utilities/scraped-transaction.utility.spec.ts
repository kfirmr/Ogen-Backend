import { toImportRows } from './scraped-transaction.utility';
import { TBankCompany } from '../constants/bank-company.constant';
import { ScrapedTransactionDto } from '../dto/scraped-transaction.dto';
import { TScrapedTransactionStatus } from '../constants/scraped-transaction.constant';

const buildTransaction = (
  overrides: Partial<ScrapedTransactionDto> = {},
): ScrapedTransactionDto => ({
  chargedAmount: -68.1,
  description: ' CARREFOUR ',
  date: '2026-01-09T22:00:00.000Z',
  status: TScrapedTransactionStatus.COMPLETED,
  ...overrides,
});

const buildIdentifiedTransaction = (
  overrides: Partial<ScrapedTransactionDto> = {},
): ScrapedTransactionDto =>
  buildTransaction({
    identifier: '1001',
    chargedCurrency: 'ILS',
    ...overrides,
  });

const importTransactions = (txns: ScrapedTransactionDto[]) =>
  toImportRows(TBankCompany.MAX, [{ accountNumber: '4580', txns }]);

describe('toImportRows', () => {
  it('maps a completed charge to an import row dated in Israel time', () => {
    const { rows, rowErrors } = importTransactions([
      buildIdentifiedTransaction(),
    ]);

    expect(rowErrors).toEqual([]);
    expect(rows).toEqual([
      {
        amount: '68.10',
        currency: 'ILS',
        transactionDate: '2026-01-10',
        externalId: 'max:4580:1001',
        originalDescription: 'CARREFOUR',
      },
    ]);
  });

  it('skips pending charges and credits', () => {
    const { rows, rowErrors } = importTransactions([
      buildIdentifiedTransaction({ status: TScrapedTransactionStatus.PENDING }),
      buildIdentifiedTransaction({
        chargedAmount: 12000,
        description: 'SALARY',
      }),
    ]);

    expect(rows).toEqual([]);
    expect(rowErrors).toEqual([]);
  });

  it('leaves the external id empty when the bank gives no identifier', () => {
    const { rows } = importTransactions([buildTransaction()]);

    expect(rows[0].externalId).toBeNull();
  });

  it('defaults a missing currency to ILS', () => {
    const { rows } = importTransactions([buildTransaction()]);

    expect(rows[0].currency).toBe('ILS');
  });

  it('reports a charge without a description instead of importing it', () => {
    const { rows, rowErrors } = importTransactions([
      buildIdentifiedTransaction({ description: '   ' }),
    ]);

    expect(rows).toEqual([]);
    expect(rowErrors).toEqual([
      '2026-01-09T22:00:00.000Z: missing description',
    ]);
  });
});
