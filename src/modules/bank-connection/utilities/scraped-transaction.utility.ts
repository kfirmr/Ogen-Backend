import {
  MONEY_REGEX,
  MONEY_PRECISION,
  DEFAULT_CURRENCY,
} from '@Constants/money';

import {
  EXTERNAL_ID_SEPARATOR,
  TScrapedTransactionStatus,
} from '../constants/scraped-transaction.constant';

import { DATE_FORMATS } from '@Constants/date';
import { formatDate } from '@Utilities/date.utility';
import { ScrapedAccountDto } from '../dto/scraped-account.dto';
import { TBankCompany } from '../constants/bank-company.constant';
import { ScrapedTransactionDto } from '../dto/scraped-transaction.dto';
import { IImportTransactionRow } from '@Modules/statement-import/interfaces/statement-import.interface';

interface IScrapedTransactionSource {
  accountNumber: string;
  company: TBankCompany;
  transaction: ScrapedTransactionDto;
}

interface IImportRowsResult {
  rowErrors: string[];
  rows: IImportTransactionRow[];
}

type TImportRowResult =
  { row: IImportTransactionRow; error: null } | { row: null; error: string };

// Pending charges are skipped because they come back completed, often with a new identifier, and
// credits (salary, refunds) are skipped because the pipeline treats every row as spend.
const isImportableSpend = (transaction: ScrapedTransactionDto): boolean => {
  const isCompleted =
    transaction.status === TScrapedTransactionStatus.COMPLETED;
  const isDebit = transaction.chargedAmount < 0;

  return isCompleted && isDebit;
};

const buildExternalId = (source: IScrapedTransactionSource): string | null => {
  if (source.transaction.identifier == null) {
    return null;
  }

  return [
    source.company,
    source.accountNumber,
    source.transaction.identifier,
  ].join(EXTERNAL_ID_SEPARATOR);
};

const toImportRow = (source: IScrapedTransactionSource): TImportRowResult => {
  const { transaction } = source;
  const description = transaction.description.trim();
  const amount = Math.abs(transaction.chargedAmount).toFixed(
    MONEY_PRECISION.DECIMALS,
  );

  if (description === '') {
    return { row: null, error: `${transaction.date}: missing description` };
  }

  if (!MONEY_REGEX.AMOUNT.test(amount)) {
    return {
      row: null,
      error: `${description}: unsupported amount "${transaction.chargedAmount}"`,
    };
  }

  return {
    error: null,
    row: {
      amount,
      originalDescription: description,
      externalId: buildExternalId(source),
      currency: transaction.chargedCurrency ?? DEFAULT_CURRENCY,
      transactionDate: formatDate(transaction.date, DATE_FORMATS.XML_DATE),
    },
  };
};

export const toImportRows = (
  company: TBankCompany,
  accounts: ScrapedAccountDto[],
): IImportRowsResult => {
  const results = accounts.flatMap((account) =>
    account.txns.filter(isImportableSpend).map((transaction) =>
      toImportRow({
        company,
        transaction,
        accountNumber: account.accountNumber,
      }),
    ),
  );

  return {
    rows: results.flatMap((result) =>
      result.row === null ? [] : [result.row],
    ),
    rowErrors: results.flatMap((result) =>
      result.error === null ? [] : [result.error],
    ),
  };
};
