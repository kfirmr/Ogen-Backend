import { LevelService } from './level.service';
import { Level } from './entities/level.entity';
import { LevelRepository } from './level.repository';
import { UserService } from '@Modules/user/user.service';
import { User } from '@Modules/user/entities/user.entity';
import { InternalServerErrorException } from '@nestjs/common';

const buildLevel = (overrides: Partial<Level> = {}) =>
  ({
    id: 'a5f0c0de-0000-4000-8000-000000000020',
    levelNumber: 1,
    xpRequired: 0,
    title: 'Getting Started',
    ...overrides,
  }) as Level;

const buildUser = (overrides: Partial<User> = {}) =>
  ({
    id: 'a5f0c0de-0000-4000-8000-000000000001',
    totalXp: 50,
    currentLevel: 1,
    ...overrides,
  }) as User;

describe('LevelService', () => {
  const buildUserService = (overrides: Partial<UserService>) =>
    ({ getById: jest.fn(), ...overrides }) as unknown as UserService;

  const buildLevelRepository = (overrides: Partial<LevelRepository>) =>
    ({
      findNext: jest.fn(),
      findCurrentForXp: jest.fn(),
      ...overrides,
    }) as unknown as LevelRepository;

  describe('getLevelForXp', () => {
    it('returns the highest level whose threshold has been crossed', async () => {
      const level = buildLevel({ levelNumber: 2, xpRequired: 100 });
      const findCurrentForXp = jest.fn().mockResolvedValue(level);
      const levelRepository = buildLevelRepository({ findCurrentForXp });
      const service = new LevelService(buildUserService({}), levelRepository);

      const result = await service.getLevelForXp(150);

      expect(result).toBe(level);
      expect(findCurrentForXp).toHaveBeenCalledWith(150);
    });

    it('throws when no level matches (should never happen once level 1 is seeded)', async () => {
      const levelRepository = buildLevelRepository({
        findCurrentForXp: jest.fn().mockResolvedValue(null),
      });
      const service = new LevelService(buildUserService({}), levelRepository);

      await expect(service.getLevelForXp(0)).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
    });
  });

  describe('getUserProgress', () => {
    it('composes current and next level details for the user', async () => {
      const user = buildUser({ totalXp: 150, currentLevel: 2 });
      const currentLevel = buildLevel({
        levelNumber: 2,
        xpRequired: 100,
        title: 'On Track',
      });
      const nextLevel = buildLevel({
        levelNumber: 3,
        xpRequired: 300,
        title: 'Budget Builder',
      });

      const userService = buildUserService({
        getById: jest.fn().mockResolvedValue(user),
      });

      const levelRepository = buildLevelRepository({
        findCurrentForXp: jest.fn().mockResolvedValue(currentLevel),
        findNext: jest.fn().mockResolvedValue(nextLevel),
      });

      const service = new LevelService(userService, levelRepository);

      const result = await service.getUserProgress(user.id);

      expect(result).toEqual({
        totalXp: 150,
        currentLevel: 2,
        currentLevelTitle: 'On Track',
        xpToNextLevel: 150,
        nextLevelNumber: 3,
        nextLevelTitle: 'Budget Builder',
        xpRequiredForNextLevel: 300,
      });
    });

    it('reports zero xp to next level once the user is at the top level', async () => {
      const user = buildUser({ totalXp: 2000, currentLevel: 5 });
      const currentLevel = buildLevel({
        levelNumber: 5,
        xpRequired: 1500,
        title: 'Ogen Pro',
      });

      const userService = buildUserService({
        getById: jest.fn().mockResolvedValue(user),
      });

      const levelRepository = buildLevelRepository({
        findCurrentForXp: jest.fn().mockResolvedValue(currentLevel),
        findNext: jest.fn().mockResolvedValue(null),
      });

      const service = new LevelService(userService, levelRepository);

      const result = await service.getUserProgress(user.id);

      expect(result.xpToNextLevel).toBe(0);
      expect(result.nextLevelNumber).toBeNull();
    });
  });
});
