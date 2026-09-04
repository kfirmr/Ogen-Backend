export const levenshteinDistance = (a: string, b: string): number => {
  const distances: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );

  for (let i = 0; i <= a.length; i++) {
    distances[i][0] = i;
  }

  for (let j = 0; j <= b.length; j++) {
    distances[0][j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;

      distances[i][j] = Math.min(
        distances[i - 1][j] + 1,
        distances[i][j - 1] + 1,
        distances[i - 1][j - 1] + substitutionCost,
      );
    }
  }

  return distances[a.length][b.length];
};
