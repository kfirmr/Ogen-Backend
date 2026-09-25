import { Op, Transaction } from 'sequelize';
import { Injectable } from '@nestjs/common';
import { VendorAlias } from './entities/vendor-alias.entity';
import { TCreateVendorAlias } from './interfaces/vendor-alias.interface';

@Injectable()
export class VendorAliasRepository {
  public findById(id: string): Promise<VendorAlias | null> {
    return VendorAlias.findByPk(id);
  }

  public findByPattern(
    pattern: string,
    transaction?: Transaction,
  ): Promise<VendorAlias | null> {
    return VendorAlias.findOne({ where: { pattern }, transaction });
  }

  public findManyByPatterns(patterns: string[]): Promise<VendorAlias[]> {
    if (patterns.length === 0) {
      return Promise.resolve([]);
    }

    return VendorAlias.findAll({ where: { pattern: { [Op.in]: patterns } } });
  }

  public getByVendor(vendorId: string): Promise<VendorAlias[]> {
    return VendorAlias.findAll({
      where: { vendorId },
      order: [['pattern', 'ASC']],
    });
  }

  public create(
    data: TCreateVendorAlias,
    transaction?: Transaction,
  ): Promise<VendorAlias> {
    return VendorAlias.create(data, { transaction });
  }

  public async bulkCreateIgnoringDuplicates(
    records: TCreateVendorAlias[],
    transaction?: Transaction,
  ): Promise<void> {
    if (records.length === 0) {
      return;
    }

    await VendorAlias.bulkCreate(records, {
      transaction,
      ignoreDuplicates: true,
    });
  }

  public delete(id: string, transaction?: Transaction): Promise<number> {
    return VendorAlias.destroy({ where: { id }, transaction });
  }
}
