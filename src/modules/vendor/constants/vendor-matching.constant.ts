// Minimum pg_trgm similarity (0-1) for two vendor names to be treated as the same merchant.
// Tuned to catch AI-extracted variants of one name (e.g. "Gym City" vs "GymCity Ltd") without
// merging genuinely different vendors that happen to share a word.
export const VENDOR_NAME_SIMILARITY_THRESHOLD = 0.4;
