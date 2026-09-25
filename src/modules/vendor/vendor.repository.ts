import {
  Op,
  fn,
  col,
  where,
  Sequelize,
  QueryTypes,
  Transaction,
} from 'sequelize';

import {
  IVendor,
  TCreateVendor,
  ISimilarNamePair,
  ISimilarVendorMatch,
} from './interfaces/vendor.interface';

import { Vendor } from './entities/vendor.entity';
import { Injectable, Inject } from '@nestjs/common';
import { ProviderNames } from '@Providers/database/provider-names';

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

  public findByIds(
    ids: string[],
    transaction?: Transaction,
  ): Promise<Vendor[]> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }

    return Vendor.findAll({ where: { id: { [Op.in]: ids } }, transaction });
  }

  public findByLowerNames(
    names: string[],
    transaction?: Transaction,
  ): Promise<Vendor[]> {
    if (names.length === 0) {
      return Promise.resolve([]);
    }

    return Vendor.findAll({
      where: where(fn('lower', col('name')), {
        [Op.in]: names.map((name) => name.toLowerCase()),
      }),
      transaction,
    });
  }

  // Catches vendor names the AI extracted slightly differently across calls for the same
  // merchant (e.g. "Gym City" vs "GymCity Ltd"). The % operator is what lets Postgres use the
  // lower(name) trigram index; the similarity filter then applies the stricter threshold.
  public findSimilarToNames(
    names: string[],
    minimumSimilarity: number,
    transaction?: Transaction,
  ): Promise<ISimilarVendorMatch[]> {
    if (names.length === 0) {
      return Promise.resolve([]);
    }

    return this.sequelize.query<ISimilarVendorMatch>(
      `SELECT DISTINCT ON (candidate.name)
         candidate.name AS "queryName",
         vendors.id AS "vendorId"
       FROM unnest(ARRAY[:names]::text[]) AS candidate(name)
       JOIN vendors ON lower(vendors.name) % lower(candidate.name)
       WHERE similarity(lower(vendors.name), lower(candidate.name)) >= :minimumSimilarity
       ORDER BY candidate.name,
         similarity(lower(vendors.name), lower(candidate.name)) DESC`,
      {
        replacements: { names, minimumSimilarity },
        type: QueryTypes.SELECT,
        transaction,
      },
    );
  }

  // Pairs up names within one import that refer to the same merchant, so a file introducing
  // "Gym City" and "GymCity Ltd" together still creates a single vendor.
  public findSimilarNamePairs(
    names: string[],
    minimumSimilarity: number,
    transaction?: Transaction,
  ): Promise<ISimilarNamePair[]> {
    if (names.length < 2) {
      return Promise.resolve([]);
    }

    return this.sequelize.query<ISimilarNamePair>(
      `SELECT first.name AS "firstName", second.name AS "secondName"
       FROM unnest(ARRAY[:names]::text[]) WITH ORDINALITY AS first(name, position)
       JOIN unnest(ARRAY[:names]::text[]) WITH ORDINALITY AS second(name, position)
         ON first.position < second.position
       WHERE similarity(lower(first.name), lower(second.name)) >= :minimumSimilarity`,
      {
        replacements: { names, minimumSimilarity },
        type: QueryTypes.SELECT,
        transaction,
      },
    );
  }

  public async bulkCreateIgnoringDuplicates(
    records: TCreateVendor[],
    transaction?: Transaction,
  ): Promise<void> {
    if (records.length === 0) {
      return;
    }

    await Vendor.bulkCreate(records, { transaction, ignoreDuplicates: true });
  }

  public create(
    data: TCreateVendor,
    transaction?: Transaction,
  ): Promise<Vendor> {
    return Vendor.create(data, { transaction });
  }

  public findWithStaleCancellationContact(
    vendorIds: string[],
    checkedBefore: Date,
  ): Promise<Vendor[]> {
    if (vendorIds.length === 0) {
      return Promise.resolve([]);
    }

    return Vendor.findAll({
      where: {
        id: { [Op.in]: vendorIds },
        [Op.or]: [
          { cancellationCheckedAt: null },
          { cancellationCheckedAt: { [Op.lt]: checkedBefore } },
        ],
      },
    });
  }

  public update(
    id: string,
    data: Partial<IVendor>,
    transaction?: Transaction,
  ): Promise<[number]> {
    return Vendor.update(data, { where: { id }, transaction });
  }
}
