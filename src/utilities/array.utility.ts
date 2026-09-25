export const chunkArray = <TItem>(items: TItem[], size: number): TItem[][] => {
  const chunks: TItem[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

export const groupBy = <TItem, TKey>(
  items: TItem[],
  getKey: (item: TItem) => TKey,
): Map<TKey, TItem[]> =>
  items.reduce((groups, item) => {
    const key = getKey(item);

    return groups.set(key, [...(groups.get(key) ?? []), item]);
  }, new Map<TKey, TItem[]>());
