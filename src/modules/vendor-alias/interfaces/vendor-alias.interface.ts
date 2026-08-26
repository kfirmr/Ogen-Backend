import { Optional } from 'sequelize';
import { IVendor } from '@Modules/vendor/interfaces/vendor.interface';

export interface IVendorAlias {
  id: string;
  pattern: string;
  createdAt: Date;
  updatedAt: Date;
  vendorId: string;
  vendor?: IVendor;
}

export type TCreateVendorAlias = Optional<
  IVendorAlias,
  'id' | 'createdAt' | 'updatedAt'
>;
