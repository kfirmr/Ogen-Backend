import {
  buildNextCursor,
  resolveBatchSize,
  buildCursorCondition,
} from './pagination.utility';

import { Op } from 'sequelize';
import { BATCH_SIZES } from '@Constants/batch';

describe('pagination.utility', () => {
  describe('resolveBatchSize', () => {
    it('falls back to the default size', () => {
      expect(resolveBatchSize(null)).toBe(BATCH_SIZES.DEFAULT);
    });

    it('caps the requested size at the maximum', () => {
      expect(resolveBatchSize(BATCH_SIZES.MAX + 50)).toBe(BATCH_SIZES.MAX);
    });

    it('keeps a size within range', () => {
      expect(resolveBatchSize(10)).toBe(10);
    });
  });

  describe('buildCursorCondition', () => {
    it('returns an empty condition without a cursor', () => {
      expect(buildCursorCondition(null)).toEqual({});
    });

    it('breaks ties on the identifier', () => {
      const createdAt = '2026-08-24T10:00:00.000Z';

      expect(buildCursorCondition({ id: 'a-uuid', createdAt })).toEqual({
        [Op.or]: [
          { createdAt: { [Op.lt]: createdAt } },
          { id: { [Op.lt]: 'a-uuid' }, createdAt },
        ],
      });
    });
  });

  describe('buildNextCursor', () => {
    const createdAt = new Date('2026-08-24T10:00:00.000Z');

    it('returns null on a partial page', () => {
      expect(buildNextCursor([{ id: 'a-uuid', createdAt }], 25)).toBeNull();
    });

    it('returns null on an empty page', () => {
      expect(buildNextCursor([], 0)).toBeNull();
    });

    it('points at the last item of a full page', () => {
      const items = [
        { id: 'first', createdAt },
        { id: 'last', createdAt },
      ];

      expect(buildNextCursor(items, 2)).toEqual({
        id: 'last',
        createdAt: createdAt.toISOString(),
      });
    });
  });
});
