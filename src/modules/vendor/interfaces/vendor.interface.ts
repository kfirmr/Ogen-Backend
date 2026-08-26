import { Optional } from 'sequelize';
import { TVendorCategory } from '../constants/vendor-category.constant';

export interface IVendor {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  currency: string;
  cancellationEmail: string | null;
  category: TVendorCategory | null;
  averageMarketPrice: string | null;
}

export type TCreateVendor = Optional<
  IVendor,
  'id' | 'currency' | 'createdAt' | 'updatedAt'
>;
