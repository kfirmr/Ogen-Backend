import { Transaction } from 'sequelize';
import { Injectable } from '@nestjs/common';
import { User } from './entities/user.entity';
import { IUser, TCreateUser } from './interfaces/user.interface';

@Injectable()
export class UserRepository {
  public findById(id: string): Promise<User | null> {
    return User.findByPk(id);
  }

  public findByEmail(email: string): Promise<User | null> {
    return User.findOne({ where: { email } });
  }

  public findByEmailWithPassword(email: string): Promise<User | null> {
    return User.unscoped().findOne({ where: { email } });
  }

  public create(data: TCreateUser, transaction?: Transaction): Promise<User> {
    return User.create(data, { transaction });
  }

  public update(
    id: string,
    data: Partial<IUser>,
    transaction?: Transaction,
  ): Promise<[number]> {
    return User.update(data, { where: { id }, transaction });
  }

  public softDelete(id: string, transaction?: Transaction): Promise<number> {
    return User.destroy({ where: { id }, transaction });
  }

  public async incrementTotalXp(
    id: string,
    amount: number,
    transaction?: Transaction,
  ): Promise<User> {
    await User.increment('totalXp', { by: amount, where: { id }, transaction });

    return User.findByPk(id, { transaction, rejectOnEmpty: true });
  }
}
