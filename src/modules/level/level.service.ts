import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';

import { Level } from './entities/level.entity';
import { LevelRepository } from './level.repository';
import { CreateLevelDto } from './dto/create-level.dto';
import { UpdateLevelDto } from './dto/update-level.dto';
import { UserService } from '@Modules/user/user.service';
import { TypedLogger } from '../../logger/logger.service';
import { IUserProgress } from './interfaces/user-progress.interface';

@Injectable()
export class LevelService {
  private readonly logger = new TypedLogger('LevelService');

  constructor(
    private readonly userService: UserService,
    private readonly levelRepository: LevelRepository,
  ) {}

  public getAll(): Promise<Level[]> {
    return this.levelRepository.getAll();
  }

  public async getById(id: string): Promise<Level> {
    const level = await this.levelRepository.findById(id);

    if (level == null) {
      throw new NotFoundException('Level not found');
    }

    return level;
  }

  public async getLevelForXp(totalXp: number): Promise<Level> {
    const level = await this.levelRepository.findCurrentForXp(totalXp);

    if (level == null) {
      throw new InternalServerErrorException('No level found for xp total');
    }

    return level;
  }

  public async getUserProgress(userId: string): Promise<IUserProgress> {
    const user = await this.userService.getById(userId);
    const currentLevel = await this.getLevelForXp(user.totalXp);
    const nextLevel = await this.levelRepository.findNext(
      currentLevel.levelNumber,
    );

    return {
      totalXp: user.totalXp,
      currentLevel: currentLevel.levelNumber,
      currentLevelTitle: currentLevel.title,
      xpToNextLevel:
        nextLevel == null ? 0 : nextLevel.xpRequired - user.totalXp,
      nextLevelNumber: nextLevel?.levelNumber ?? null,
      nextLevelTitle: nextLevel?.title ?? null,
      xpRequiredForNextLevel: nextLevel?.xpRequired ?? null,
    };
  }

  public async create(data: CreateLevelDto): Promise<Level> {
    try {
      return await this.levelRepository.create(data);
    } catch (error) {
      this.logger.error({ message: 'Failed to create level', error });

      throw error;
    }
  }

  public async update(id: string, data: UpdateLevelDto): Promise<Level> {
    await this.getById(id);
    await this.levelRepository.update(id, data);

    return this.getById(id);
  }
}
