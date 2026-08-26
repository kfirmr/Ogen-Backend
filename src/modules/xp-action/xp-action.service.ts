import { XpAction } from './entities/xp-action.entity';
import { TypedLogger } from '../../logger/logger.service';
import { XpActionRepository } from './xp-action.repository';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateXpActionDto } from './dto/create-xp-action.dto';
import { UpdateXpActionDto } from './dto/update-xp-action.dto';

@Injectable()
export class XpActionService {
  private readonly logger = new TypedLogger('XpActionService');

  constructor(private readonly xpActionRepository: XpActionRepository) {}

  public getAll(): Promise<XpAction[]> {
    return this.xpActionRepository.getAll();
  }

  public async getById(id: string): Promise<XpAction> {
    const xpAction = await this.xpActionRepository.findById(id);

    if (xpAction == null) {
      throw new NotFoundException('XP action not found');
    }

    return xpAction;
  }

  public getActiveByKey(key: string): Promise<XpAction | null> {
    return this.xpActionRepository.findActiveByKey(key);
  }

  public async create(data: CreateXpActionDto): Promise<XpAction> {
    try {
      return await this.xpActionRepository.create(data);
    } catch (error) {
      this.logger.error({ message: 'Failed to create xp action', error });

      throw error;
    }
  }

  public async update(id: string, data: UpdateXpActionDto): Promise<XpAction> {
    await this.getById(id);
    await this.xpActionRepository.update(id, data);

    return this.getById(id);
  }
}
