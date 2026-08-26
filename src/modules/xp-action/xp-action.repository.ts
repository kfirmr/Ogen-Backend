import { Transaction } from 'sequelize';
import { Injectable } from '@nestjs/common';
import { XpAction } from './entities/xp-action.entity';
import { IXpAction, TCreateXpAction } from './interfaces/xp-action.interface';

@Injectable()
export class XpActionRepository {
  public getAll(): Promise<XpAction[]> {
    return XpAction.findAll({ order: [['key', 'ASC']] });
  }

  public findById(id: string): Promise<XpAction | null> {
    return XpAction.findByPk(id);
  }

  public findActiveByKey(key: string): Promise<XpAction | null> {
    return XpAction.findOne({ where: { key, isActive: true } });
  }

  public create(
    data: TCreateXpAction,
    transaction?: Transaction,
  ): Promise<XpAction> {
    return XpAction.create(data, { transaction });
  }

  public update(
    id: string,
    data: Partial<IXpAction>,
    transaction?: Transaction,
  ): Promise<[number]> {
    return XpAction.update(data, { where: { id }, transaction });
  }
}
