import {
  TStatementColumnField,
  STATEMENT_COLUMN_HEADERS,
  REQUIRED_STATEMENT_COLUMN_FIELDS,
} from './xlsx-column-map.constant';

import { levenshteinDistance } from '@Utilities/levenshtein-distance.utility';

export const HEADER_SIMILARITY_THRESHOLD = 0.6;

export type THeaderByField = Partial<Record<TStatementColumnField, string>>;

export interface IHeaderResolutionResult {
  headerByField: THeaderByField;
  missingRequiredFields: TStatementColumnField[];
}

const FIELD_RESOLUTION_ORDER: TStatementColumnField[] = [
  TStatementColumnField.DATE,
  TStatementColumnField.DESCRIPTION,
  TStatementColumnField.AMOUNT,
  TStatementColumnField.CURRENCY,
  TStatementColumnField.EXTERNAL_ID,
];

export const resolveColumnHeaders = (
  rawHeaders: string[],
): IHeaderResolutionResult => {
  const headerByField: THeaderByField = {};
  const remainingHeaders = [...rawHeaders];

  for (const field of FIELD_RESOLUTION_ORDER) {
    const match = findBestMatch(
      STATEMENT_COLUMN_HEADERS[field],
      remainingHeaders,
    );

    if (match == null) {
      continue;
    }

    headerByField[field] = match;
    remainingHeaders.splice(remainingHeaders.indexOf(match), 1);
  }

  const missingRequiredFields = REQUIRED_STATEMENT_COLUMN_FIELDS.filter(
    (field) => headerByField[field] == null,
  );

  return { headerByField, missingRequiredFields };
};

const findBestMatch = (
  canonicalHeader: string,
  candidates: string[],
): string | null => {
  const normalizedCanonical = normalizeHeader(canonicalHeader);

  let bestCandidate: string | null = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    const score = computeSimilarity(
      normalizedCanonical,
      normalizeHeader(candidate),
    );

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  const isConfidentMatch =
    bestCandidate != null && bestScore >= HEADER_SIMILARITY_THRESHOLD;

  return isConfidentMatch ? bestCandidate : null;
};

const normalizeHeader = (header: string): string =>
  header.trim().toLowerCase().replace(/\s+/g, ' ');

const computeSimilarity = (a: string, b: string): number => {
  const maxLength = Math.max(a.length, b.length);

  if (maxLength === 0) {
    return 1;
  }

  return 1 - levenshteinDistance(a, b) / maxLength;
};
