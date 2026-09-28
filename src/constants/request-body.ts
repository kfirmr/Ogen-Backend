// A year of bank history reported by the worker outgrows Express's 100kb default; Vercel itself
// rejects request bodies above 4.5MB, so the limit stays just under that.
export const REQUEST_BODY_LIMITS = {
  JSON: '4mb',
} as const;
