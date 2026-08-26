import { Op, Transaction } from 'sequelize';
import { Injectable } from '@nestjs/common';
import { Level } from './entities/level.entity';
import { ILevel, TCreateLevel } from './interfaces/level.interface';

@Injectable()
export class LevelRepository {
  public getAll(): Promise<Level[]> {
    return Level.findAll({ order: [['levelNumber', 'ASC']] });
  }

  public findById(id: string): Promise<Level | null> {
    return Level.findByPk(id);
  }

  public findByNumber(levelNumber: number): Promise<Level | null> {
    return Level.findOne({ where: { levelNumber } });
  }

  public findCurrentForXp(totalXp: number): Promise<Level | null> {
    return Level.findOne({
      where: { xpRequired: { [Op.lte]: totalXp } },
      order: [['xpRequired', 'DESC']],
    });
  }

  public findNext(levelNumber: number): Promise<Level | null> {
    return Level.findOne({
      where: { levelNumber: { [Op.gt]: levelNumber } },
      order: [['levelNumber', 'ASC']],
    });
  }

  public create(data: TCreateLevel, transaction?: Transaction): Promise<Level> {
    return Level.create(data, { transaction });
  }

  public update(
    id: string,
    data: Partial<ILevel>,
    transaction?: Transaction,
  ): Promise<[number]> {
    return Level.update(data, { where: { id }, transaction });
  }
}
