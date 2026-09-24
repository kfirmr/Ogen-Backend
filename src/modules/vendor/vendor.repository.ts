import { Vendor } from './entities/vendor.entity';
import { Injectable, Inject } from '@nestjs/common';
import { ProviderNames } from '@Providers/database/provider-names';
import { IVendor, TCreateVendor } from './interfaces/vendor.interface';
import { fn, col, where, QueryTypes, Sequelize, Transaction } from 'sequelize';

interface ISimilarVendorRow {
  id: string;
}

@Injectable()
export class VendorRepository {
  constructor(
    @Inject(ProviderNames.SEQUELIZE)
    private readonly sequelize: Sequelize,
  ) {}

  public getAll(): Promise<Vendor[]> {
    return Vendor.findAll({ order: [['name', 'ASC']] });
  }

  public findById(
    id: string,
    transaction?: Transaction,
  ): Promise<Vendor | null> {
    return Vendor.findByPk(id, { transaction });
  }

  public findByName(
    name: string,
    transaction?: Transaction,
  ): Promise<Vendor | null> {
    return Vendor.findOne({
      where: where(fn('lower', col('name')), name.toLowerCase()),
      transaction,
    });
  }

  // Catches vendor names the AI extracted slightly differently across calls for the same
  // merchant (e.g. "Gym City" vs "GymCity Ltd"), so they resolve to one vendor instead of
  // silently spawning a duplicate vendor and, downstream, a duplicate subscription.
  public async findSimilarByName(
    name: string,
    minimumSimilarity: number,
    transaction?: Transaction,
  ): Promise<Vendor | null> {
    const [match] = await this.sequelize.query<ISimilarVendorRow>(
      `SELECT id
       FROM vendors
       WHERE similarity(lower(name), lower(:name)) >= :minimumSimilarity
       ORDER BY similarity(lower(name), lower(:name)) DESC
       LIMIT 1`,
      {
        replacements: { name, minimumSimilarity },
        type: QueryTypes.SELECT,
        transaction,
      },
    );

    if (match == null) {
      return null;
    }

    return this.findById(match.id, transaction);
  }

  public create(
    data: TCreateVendor,
    transaction?: Transaction,
  ): Promise<Vendor> {
    return Vendor.create(data, { transaction });
  }

  public update(
    id: string,
    data: Partial<IVendor>,
    transaction?: Transaction,
  ): Promise<[number]> {
    return Vendor.update(data, { where: { id }, transaction });
  }
}
