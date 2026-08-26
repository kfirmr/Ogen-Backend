import { Sequelize, Transaction } from 'sequelize';
import { XpEventService } from './xp-event.service';
import { XpEvent } from './entities/xp-event.entity';
import { UserService } from '@Modules/user/user.service';
import { User } from '@Modules/user/entities/user.entity';
import { XpEventRepository } from './xp-event.repository';
import { LevelService } from '@Modules/level/level.service';
import { Level } from '@Modules/level/entities/level.entity';
import { XpActionService } from '@Modules/xp-action/xp-action.service';
import { XpAction } from '@Modules/xp-action/entities/xp-action.entity';

const buildXpAction = (overrides: Partial<XpAction> = {}) =>
  ({
    id: 'a5f0c0de-0000-4000-8000-000000000010',
    key: 'SUBSCRIPTION_ADDED',
    xpValue: 10,
    isActive: true,
    ...overrides,
  }) as XpAction;

const buildXpEvent = (overrides: Partial<XpEvent> = {}) =>
  ({
    id: 'a5f0c0de-0000-4000-8000-000000000030',
    userId: 'a5f0c0de-0000-4000-8000-000000000001',
    xpActionId: 'a5f0c0de-0000-4000-8000-000000000010',
    xpAwarded: 10,
    ...overrides,
  }) as XpEvent;

const buildUser = (overrides: Partial<User> = {}) =>
  ({
    id: 'a5f0c0de-0000-4000-8000-000000000001',
    totalXp: 10,
    currentLevel: 1,
    ...overrides,
  }) as User;

const buildLevel = (overrides: Partial<Level> = {}) =>
  ({
    levelNumber: 1,
    xpRequired: 0,
    title: 'Getting Started',
    ...overrides,
  }) as Level;

describe('XpEventService', () => {
  const buildTransaction = () => ({
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
  });

  const buildSequelize = (transactionFn: jest.Mock) =>
    ({ transaction: transactionFn }) as unknown as Sequelize;

  const buildUserService = (overrides: Partial<UserService>) =>
    ({
      incrementXp: jest.fn(),
      setLevel: jest.fn(),
      ...overrides,
    }) as unknown as UserService;

  const buildLevelService = (overrides: Partial<LevelService>) =>
    ({ getLevelForXp: jest.fn(), ...overrides }) as unknown as LevelService;

  const buildXpActionService = (overrides: Partial<XpActionService>) =>
    ({ getActiveByKey: jest.fn(), ...overrides }) as unknown as XpActionService;

  const buildXpEventRepository = (overrides: Partial<XpEventRepository>) =>
    ({ create: jest.fn(), ...overrides }) as unknown as XpEventRepository;

  describe('award', () => {
    it('snapshots the action xp value, increments the user, and commits', async () => {
      const transaction = buildTransaction();
      const transactionFn = jest.fn().mockResolvedValue(transaction);
      const sequelize = buildSequelize(transactionFn);
      const xpAction = buildXpAction({ xpValue: 10 });
      const xpEvent = buildXpEvent({ xpAwarded: 10 });
      const user = buildUser({ totalXp: 10, currentLevel: 1 });
      const level = buildLevel({ levelNumber: 1 });

      const incrementXp = jest.fn().mockResolvedValue(user);
      const userService = buildUserService({ incrementXp });
      const levelService = buildLevelService({
        getLevelForXp: jest.fn().mockResolvedValue(level),
      });
      const xpActionService = buildXpActionService({
        getActiveByKey: jest.fn().mockResolvedValue(xpAction),
      });
      const create = jest.fn().mockResolvedValue(xpEvent);
      const xpEventRepository = buildXpEventRepository({ create });

      const service = new XpEventService(
        sequelize,
        userService,
        levelService,
        xpActionService,
        xpEventRepository,
      );

      const result = await service.award('user-1', 'SUBSCRIPTION_ADDED');

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ xpAwarded: 10 }),
        transaction,
      );
      expect(incrementXp).toHaveBeenCalledWith('user-1', 10, transaction);
      expect(transaction.commit).toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({
          xpEvent,
          totalXp: 10,
          leveledUp: false,
          currentLevel: 1,
        }),
      );
    });

    it('detects a level-up and updates the user current level', async () => {
      const transaction = buildTransaction();
      const sequelize = buildSequelize(
        jest.fn().mockResolvedValue(transaction),
      );
      const xpAction = buildXpAction({ xpValue: 10 });
      const user = buildUser({ totalXp: 100, currentLevel: 1 });
      const newLevel = buildLevel({ levelNumber: 2, title: 'On Track' });

      const setLevel = jest.fn().mockResolvedValue(undefined);
      const userService = buildUserService({
        incrementXp: jest.fn().mockResolvedValue(user),
        setLevel,
      });
      const levelService = buildLevelService({
        getLevelForXp: jest.fn().mockResolvedValue(newLevel),
      });
      const xpActionService = buildXpActionService({
        getActiveByKey: jest.fn().mockResolvedValue(xpAction),
      });
      const xpEventRepository = buildXpEventRepository({
        create: jest.fn().mockResolvedValue(buildXpEvent()),
      });

      const service = new XpEventService(
        sequelize,
        userService,
        levelService,
        xpActionService,
        xpEventRepository,
      );

      const result = await service.award('user-1', 'SUBSCRIPTION_ADDED');

      expect(setLevel).toHaveBeenCalledWith('user-1', 2, transaction);
      expect(result?.leveledUp).toBe(true);
    });

    it('no-ops without throwing for an unknown or inactive action key', async () => {
      const transaction = buildTransaction();
      const sequelize = buildSequelize(
        jest.fn().mockResolvedValue(transaction),
      );

      const userService = buildUserService({});
      const levelService = buildLevelService({});
      const xpActionService = buildXpActionService({
        getActiveByKey: jest.fn().mockResolvedValue(null),
      });
      const create = jest.fn();
      const xpEventRepository = buildXpEventRepository({ create });

      const service = new XpEventService(
        sequelize,
        userService,
        levelService,
        xpActionService,
        xpEventRepository,
      );

      const result = await service.award('user-1', 'NOT_A_REAL_KEY');

      expect(result).toBeNull();
      expect(create).not.toHaveBeenCalled();
      expect(transaction.commit).toHaveBeenCalled();
    });

    it('rolls back and rethrows when a downstream write fails', async () => {
      const transaction = buildTransaction();
      const sequelize = buildSequelize(
        jest.fn().mockResolvedValue(transaction),
      );
      const xpAction = buildXpAction();
      const failure = new Error('db unavailable');

      const userService = buildUserService({
        incrementXp: jest.fn().mockRejectedValue(failure),
      });
      const levelService = buildLevelService({});
      const xpActionService = buildXpActionService({
        getActiveByKey: jest.fn().mockResolvedValue(xpAction),
      });
      const xpEventRepository = buildXpEventRepository({
        create: jest.fn().mockResolvedValue(buildXpEvent()),
      });

      const service = new XpEventService(
        sequelize,
        userService,
        levelService,
        xpActionService,
        xpEventRepository,
      );

      await expect(service.award('user-1', 'SUBSCRIPTION_ADDED')).rejects.toBe(
        failure,
      );
      expect(transaction.rollback).toHaveBeenCalled();
      expect(transaction.commit).not.toHaveBeenCalled();
    });

    it('reuses a transaction passed in by the caller instead of opening its own', async () => {
      const callerTransaction = buildTransaction();
      const transactionFn = jest.fn().mockResolvedValue(buildTransaction());
      const sequelize = buildSequelize(transactionFn);
      const xpAction = buildXpAction();
      const user = buildUser();
      const level = buildLevel();

      const userService = buildUserService({
        incrementXp: jest.fn().mockResolvedValue(user),
      });
      const levelService = buildLevelService({
        getLevelForXp: jest.fn().mockResolvedValue(level),
      });
      const xpActionService = buildXpActionService({
        getActiveByKey: jest.fn().mockResolvedValue(xpAction),
      });
      const xpEventRepository = buildXpEventRepository({
        create: jest.fn().mockResolvedValue(buildXpEvent()),
      });

      const service = new XpEventService(
        sequelize,
        userService,
        levelService,
        xpActionService,
        xpEventRepository,
      );

      await service.award(
        'user-1',
        'SUBSCRIPTION_ADDED',
        callerTransaction as unknown as Transaction,
      );

      expect(transactionFn).not.toHaveBeenCalled();
      expect(callerTransaction.commit).not.toHaveBeenCalled();
    });
  });
});
