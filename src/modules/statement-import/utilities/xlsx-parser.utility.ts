import {
  THeaderByField,
  resolveColumnHeaders,
} from './header-resolver.utility';

import * as XLSX from 'xlsx';
import { MONEY_REGEX, DEFAULT_CURRENCY } from '@Constants/money';
import { TStatementColumnField } from './xlsx-column-map.constant';

export interface IParsedTransactionRow {
  amount: string;
  currency: string;
  externalId?: string;
  transactionDate: string;
  originalDescription: string;
}

export interface IParseTransactionRowsResult {
  parseErrors: string[];
  headerError: string | null;
  rows: IParsedTransactionRow[];
}

type TRawRow = Record<string, unknown>;

type TParsedRowResult =
  | { row: IParsedTransactionRow; error?: undefined }
  | { row?: undefined; error: string };

export const parseTransactionRows = (
  buffer: Buffer,
): IParseTransactionRowsResult => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];

  if (firstSheetName == null) {
    return {
      rows: [],
      parseErrors: [],
      headerError: 'The uploaded file has no sheets',
    };
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rawRowsAsArrays = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
  });

  if (rawRowsAsArrays.length === 0) {
    return {
      rows: [],
      parseErrors: [],
      headerError: 'The uploaded file has no header row',
    };
  }

  const headerRow = findHeaderRow(rawRowsAsArrays);

  if (headerRow == null) {
    const { missingRequiredFields } = resolveColumnHeaders(
      rawRowsAsArrays[0].filter(
        (cell): cell is string => typeof cell === 'string',
      ),
    );

    return {
      rows: [],
      parseErrors: [],
      headerError: `Could not identify the following required column(s): ${missingRequiredFields.join(', ')}`,
    };
  }

  const { headerByField, rowIndex: headerRowIndex } = headerRow;

  const rows: IParsedTransactionRow[] = [];
  const parseErrors: string[] = [];

  const rawRows = XLSX.utils.sheet_to_json<TRawRow>(sheet, {
    defval: null,
    raw: false,
    range: headerRowIndex,
  });

  rawRows.forEach((rawRow, index) => {
    const rowNumber = headerRowIndex + index + 2; // account for the header row and 1-based row numbering
    const result = parseRow(rawRow, rowNumber, headerByField);

    if (result.error != null) {
      parseErrors.push(result.error);
      return;
    }

    rows.push(result.row);
  });

  return { rows, parseErrors, headerError: null };
};

interface IHeaderRowMatch {
  rowIndex: number;
  headerByField: THeaderByField;
}

// Real statement exports place the header row after title/summary rows (and may repeat it per
// section), so every row is scanned until one resolves all required fields. Sparse rows can
// contain undefined cells for unpopulated columns, so non-string cells are filtered out first.
const findHeaderRow = (rawRows: string[][]): IHeaderRowMatch | null => {
  for (const [rowIndex, rawRow] of rawRows.entries()) {
    const headerCandidates = (rawRow ?? []).filter(
      (cell): cell is string => typeof cell === 'string',
    );
    const { headerByField, missingRequiredFields } =
      resolveColumnHeaders(headerCandidates);

    if (missingRequiredFields.length === 0) {
      return { headerByField, rowIndex };
    }
  }

  return null;
};

const parseRow = (
  rawRow: TRawRow,
  rowNumber: number,
  headerByField: THeaderByField,
): TParsedRowResult => {
  // Non-null assertions below are safe: parseTransactionRows only reaches this call once
  // resolveColumnHeaders has confirmed every required field has a resolved header.
  const description = rawRow[headerByField[TStatementColumnField.DESCRIPTION]!];
  const isDescriptionMissing =
    typeof description !== 'string' || description.trim() === '';

  if (isDescriptionMissing) {
    return { error: `Row ${rowNumber}: missing description` };
  }

  const rawAmount = rawRow[headerByField[TStatementColumnField.AMOUNT]!];
  const amount = normalizeAmount(rawAmount);

  if (amount == null) {
    return {
      error: `Row ${rowNumber}: unparseable amount "${String(rawAmount)}"`,
    };
  }

  const rawDate = rawRow[headerByField[TStatementColumnField.DATE]!];
  const transactionDate = normalizeDate(rawDate);

  if (transactionDate == null) {
    return { error: `Row ${rowNumber}: unparseable date "${String(rawDate)}"` };
  }

  const externalIdHeader = headerByField[TStatementColumnField.EXTERNAL_ID];

  return {
    row: {
      amount,
      transactionDate,
      originalDescription: description.trim(),
      currency: normalizeCurrency(
        rawRow[headerByField[TStatementColumnField.CURRENCY]!],
      ),
      externalId:
        externalIdHeader != null
          ? normalizeExternalId(rawRow[externalIdHeader])
          : undefined,
    },
  };
};

const normalizeAmount = (rawAmount: unknown): string | null => {
  if (typeof rawAmount !== 'string' && typeof rawAmount !== 'number') {
    return null;
  }

  const amount = String(rawAmount).trim().replace(/^-/, '').replace(/,/g, '');

  if (!MONEY_REGEX.AMOUNT.test(amount)) {
    return null;
  }

  return amount;
};

const DAY_MONTH_YEAR_DATE_REGEX = /^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})$/;

const normalizeDate = (rawDate: unknown): string | null => {
  if (typeof rawDate !== 'string' || rawDate.trim() === '') {
    return null;
  }

  const trimmedDate = rawDate.trim();
  const dayMonthYearMatch = trimmedDate.match(DAY_MONTH_YEAR_DATE_REGEX);

  if (dayMonthYearMatch != null) {
    return normalizeDayMonthYearDate(dayMonthYearMatch);
  }

  const date = new Date(trimmedDate);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
};

// Israeli card statements commonly use day.month.year or day-month-year (e.g. 26.08.26,
// 15-07-2026), which native Date parsing does not recognize; a two-digit year is treated as 20XX.
const normalizeDayMonthYearDate = (
  dayMonthYearMatch: RegExpMatchArray,
): string | null => {
  const [, day, month, year] = dayMonthYearMatch;
  const fullYear = year.length === 2 ? `20${year}` : year;
  const isoDate = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  const parsedDate = new Date(isoDate);

  return Number.isNaN(parsedDate.getTime()) ? null : isoDate;
};

const normalizeCurrency = (rawCurrency: unknown): string => {
  if (typeof rawCurrency !== 'string') {
    return DEFAULT_CURRENCY;
  }

  const currency = rawCurrency.trim().toUpperCase();

  return MONEY_REGEX.CURRENCY.test(currency) ? currency : DEFAULT_CURRENCY;
};

const normalizeExternalId = (rawExternalId: unknown): string | undefined => {
  if (typeof rawExternalId !== 'string' || rawExternalId.trim() === '') {
    return undefined;
  }

  return rawExternalId.trim();
};
