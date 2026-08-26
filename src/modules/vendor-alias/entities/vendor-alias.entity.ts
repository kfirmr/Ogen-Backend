import {
  Table,
  Model,
  Unique,
  Column,
  Default,
  DataType,
  BelongsTo,
  AllowNull,
  CreatedAt,
  UpdatedAt,
  ForeignKey,
  PrimaryKey,
} from 'sequelize-typescript';

import {
  IVendorAlias,
  TCreateVendorAlias,
} from '../interfaces/vendor-alias.interface';

import { DATA_LENGTHS } from '@Constants/data-length';
import { Vendor } from '@Modules/vendor/entities/vendor.entity';

@Table({
  tableName: 'vendor_aliases',
  indexes: [{ name: 'idx_vendor_aliases_vendor', fields: ['vendor_id'] }],
})
export class VendorAlias
  extends Model<IVendorAlias, TCreateVendorAlias>
  implements IVendorAlias
{
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({ type: DataType.UUID })
  declare id: string;

  @AllowNull(false)
  @ForeignKey(() => Vendor)
  @Column({ type: DataType.UUID })
  declare vendorId: string;

  @Unique
  @AllowNull(false)
  @Column({ type: DataType.STRING(DATA_LENGTHS.PATTERN) })
  declare pattern: string;

  @BelongsTo(() => Vendor)
  declare vendor: Vendor;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}
