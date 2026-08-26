import { Op, WhereOptions } from 'sequelize';
import { BATCH_SIZES } from '@Constants/batch';
import { IBatchCursor } from '@Interfaces/batch.interface';

interface ICursorItem {
  id: string;
  createdAt: Date;
}

export const resolveBatchSize = (batchSize?: number | null): number => {
  if (batchSize == null) {
    return BATCH_SIZES.DEFAULT;
  }

  return Math.min(batchSize, BATCH_SIZES.MAX);
};

export const buildCursorCondition = (
  cursor?: IBatchCursor | null,
): WhereOptions => {
  if (cursor == null) {
    return {};
  }

  return {
    [Op.or]: [
      { createdAt: { [Op.lt]: cursor.createdAt } },
      { id: { [Op.lt]: cursor.id }, createdAt: cursor.createdAt },
    ],
  };
};

export const buildNextCursor = <TItem extends ICursorItem>(
  items: TItem[],
  batchSize: number,
): IBatchCursor | null => {
  const isLastPage = items.length < batchSize;

  if (isLastPage) {
    return null;
  }

  const lastItem = items.at(-1) ?? null;

  if (lastItem == null) {
    return null;
  }

  return { id: lastItem.id, createdAt: lastItem.createdAt.toISOString() };
};
