const WHITESPACE_PATTERN = /\s+/g;
const NOISE_PATTERN = /[^a-z0-9\u0590-\u05ff ]/g;

export const normalizeDescription = (description: string): string => {
  return description
    .toLowerCase()
    .replace(NOISE_PATTERN, ' ')
    .replace(WHITESPACE_PATTERN, ' ')
    .trim();
};
