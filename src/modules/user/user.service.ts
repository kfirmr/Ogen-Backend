import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { Transaction } from 'sequelize';
import { User } from './entities/user.entity';
import { UserRepository } from './user.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { TypedLogger } from '../../logger/logger.service';
import { hashPassword, isPasswordMatching } from '@Utilities/password.utility';

@Injectable()
export class UserService {
  private readonly logger = new TypedLogger('UserService');

  constructor(private readonly userRepository: UserRepository) {}

  public async getById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);

    if (user == null) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  public async create(data: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findByEmail(data.email);

    if (existingUser != null) {
      throw new ConflictException('Email is already registered');
    }

    try {
      return await this.userRepository.create({
        email: data.email,
        fullName: data.fullName,
        passwordHash: hashPassword(data.password),
      });
    } catch (error) {
      this.logger.error({ message: 'Failed to create user', error });

      throw error;
    }
  }

  public async update(id: string, data: UpdateUserDto): Promise<User> {
    await this.getById(id);

    if (data.email != null) {
      await this.assertEmailIsAvailable(id, data.email);
    }

    await this.userRepository.update(id, data);

    return this.getById(id);
  }

  public async delete(id: string): Promise<void> {
    await this.getById(id);
    await this.userRepository.softDelete(id);
  }

  public async verifyCredentials(
    email: string,
    password: string,
  ): Promise<User | null> {
    const user = await this.userRepository.findByEmailWithPassword(email);

    if (user == null) {
      return null;
    }

    if (!isPasswordMatching(password, user.passwordHash)) {
      return null;
    }

    return user;
  }

  public incrementXp(
    userId: string,
    amount: number,
    transaction?: Transaction,
  ): Promise<User> {
    return this.userRepository.incrementTotalXp(userId, amount, transaction);
  }

  public async setLevel(
    userId: string,
    levelNumber: number,
    transaction?: Transaction,
  ): Promise<void> {
    await this.userRepository.updateCurrentLevel(
      userId,
      levelNumber,
      transaction,
    );
  }

  private async assertEmailIsAvailable(
    id: string,
    email: string,
  ): Promise<void> {
    const owner = await this.userRepository.findByEmail(email);

    if (owner != null && owner.id !== id) {
      throw new ConflictException('Email is already registered');
    }
  }
}
