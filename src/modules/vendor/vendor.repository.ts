import { Transaction } from 'sequelize';
import { Injectable } from '@nestjs/common';
import { Vendor } from './entities/vendor.entity';
import { IVendor, TCreateVendor } from './interfaces/vendor.interface';

@Injectable()
export class VendorRepository {
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
    return Vendor.findOne({ where: { name }, transaction });
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
