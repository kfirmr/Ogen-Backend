import { groupBy } from '@Utilities/array.utility';
import { ISimilarNamePair } from '../interfaces/vendor.interface';

export const toNameKey = (name: string): string => name.toLowerCase();

const toSimilarNamesByName = (
  pairs: ISimilarNamePair[],
): Map<string, string[]> => {
  const edges = pairs.flatMap((pair) => [
    { name: pair.firstName, similarName: pair.secondName },
    { name: pair.secondName, similarName: pair.firstName },
  ]);
  const edgesByName = groupBy(edges, (edge) => edge.name);

  return new Map(
    [...edgesByName].map(([name, nameEdges]) => [
      name,
      nameEdges.map((edge) => edge.similarName),
    ]),
  );
};

// Each name maps to the first earlier name it resembles, so every merchant in the batch
// collapses onto one canonical spelling before any vendor is looked up or created.
export const mapToCanonicalNames = (
  names: string[],
  similarPairs: ISimilarNamePair[],
): Map<string, string> => {
  const similarNamesByName = toSimilarNamesByName(similarPairs);

  return names.reduce((canonicalByName, name) => {
    const earlierSimilarName =
      (similarNamesByName.get(name) ?? []).find((similarName) =>
        canonicalByName.has(similarName),
      ) ?? null;
    const canonicalName =
      earlierSimilarName === null
        ? name
        : (canonicalByName.get(earlierSimilarName) ?? name);

    return canonicalByName.set(name, canonicalName);
  }, new Map<string, string>());
};
