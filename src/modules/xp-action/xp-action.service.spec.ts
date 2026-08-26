import { NotFoundException } from '@nestjs/common';
import { XpActionService } from './xp-action.service';
import { XpAction } from './entities/xp-action.entity';
import { XpActionRepository } from './xp-action.repository';

const buildXpAction = (overrides: Partial<XpAction> = {}) =>
  ({
    id: 'a5f0c0de-0000-4000-8000-000000000010',
    key: 'SUBSCRIPTION_ADDED',
    xpValue: 10,
    description: 'User added a subscription to track',
    isActive: true,
    ...overrides,
  }) as XpAction;

describe('XpActionService', () => {
  const buildRepository = (overrides: Partial<XpActionRepository>) =>
    ({
      findById: jest.fn(),
      findActiveByKey: jest.fn(),
      ...overrides,
    }) as unknown as XpActionRepository;

  describe('getActiveByKey', () => {
    it('returns the active action when the repository finds one', async () => {
      const xpAction = buildXpAction();
      const findActiveByKey = jest.fn().mockResolvedValue(xpAction);
      const repository = buildRepository({ findActiveByKey });
      const service = new XpActionService(repository);

      const result = await service.getActiveByKey('SUBSCRIPTION_ADDED');

      expect(result).toBe(xpAction);
      expect(findActiveByKey).toHaveBeenCalledWith('SUBSCRIPTION_ADDED');
    });

    it('returns null for an unknown or inactive action key', async () => {
      const repository = buildRepository({
        findActiveByKey: jest.fn().mockResolvedValue(null),
      });
      const service = new XpActionService(repository);

      const result = await service.getActiveByKey('NOT_A_REAL_KEY');

      expect(result).toBeNull();
    });
  });

  describe('getById', () => {
    it('throws NotFoundException when the action does not exist', async () => {
      const repository = buildRepository({
        findById: jest.fn().mockResolvedValue(null),
      });
      const service = new XpActionService(repository);

      await expect(
        service.getById('a5f0c0de-0000-4000-8000-000000000099'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
