export const isObject = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
};

// Returns the candidate values for exactly the fields that are still empty on the current object.
export const pickMissingFields = <TFields extends object>(
  current: TFields,
  candidates: Partial<TFields>,
): Partial<TFields> =>
  (Object.keys(candidates) as (keyof TFields)[]).reduce<Partial<TFields>>(
    (missingFields, key) => {
      const isEmpty = current[key] == null;
      const hasCandidate = candidates[key] != null;

      return isEmpty && hasCandidate
        ? { ...missingFields, [key]: candidates[key] }
        : missingFields;
    },
    {},
  );
