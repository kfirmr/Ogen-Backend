import { Transaction } from 'sequelize';
import { Injectable } from '@nestjs/common';
import { VendorAlias } from './entities/vendor-alias.entity';
import { TCreateVendorAlias } from './interfaces/vendor-alias.interface';

@Injectable()
export class VendorAliasRepository {
  public findById(id: string): Promise<VendorAlias | null> {
    return VendorAlias.findByPk(id);
  }

  public findByPattern(pattern: string): Promise<VendorAlias | null> {
    return VendorAlias.findOne({ where: { pattern } });
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

  public delete(id: string, transaction?: Transaction): Promise<number> {
    return VendorAlias.destroy({ where: { id }, transaction });
  }
}
