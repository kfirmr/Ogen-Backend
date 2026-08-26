import {
  Table,
  Model,
  Unique,
  Column,
  Default,
  DataType,
  AllowNull,
  CreatedAt,
  UpdatedAt,
  PrimaryKey,
} from 'sequelize-typescript';

import {
  TVendorCategory,
  VENDOR_CATEGORY_VALUES,
} from '../constants/vendor-category.constant';

import { DATA_LENGTHS } from '@Constants/data-length';
import { DEFAULT_CURRENCY, MONEY_PRECISION } from '@Constants/money';
import { IVendor, TCreateVendor } from '../interfaces/vendor.interface';

@Table({ tableName: 'vendors' })
export class Vendor extends Model<IVendor, TCreateVendor> implements IVendor {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({ type: DataType.UUID })
  declare id: string;

  @Unique
  @AllowNull(false)
  @Column({ type: DataType.STRING(DATA_LENGTHS.NAME) })
  declare name: string;

  @AllowNull(true)
  @Column({ type: DataType.STRING(DATA_LENGTHS.EMAIL) })
  declare cancellationEmail: string | null;

  @AllowNull(true)
  @Column({
    type: DataType.DECIMAL(MONEY_PRECISION.DIGITS, MONEY_PRECISION.DECIMALS),
  })
  declare averageMarketPrice: string | null;

  @AllowNull(false)
  @Default(DEFAULT_CURRENCY)
  @Column({ type: DataType.CHAR(DATA_LENGTHS.CURRENCY) })
  declare currency: string;

  @AllowNull(true)
  @Column({ type: DataType.ENUM, values: VENDOR_CATEGORY_VALUES })
  declare category: TVendorCategory | null;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}
