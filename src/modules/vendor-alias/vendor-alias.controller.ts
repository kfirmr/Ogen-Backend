import {
  Get,
  Post,
  Body,
  Param,
  Delete,
  Controller,
  ParseUUIDPipe,
} from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';
import { VendorAliasService } from './vendor-alias.service';
import { VendorAlias } from './entities/vendor-alias.entity';
import { CreateVendorAliasDto } from './dto/create-vendor-alias.dto';

@ApiTags('vendor-alias')
@Controller('vendor-alias')
export class VendorAliasController {
  constructor(private readonly vendorAliasService: VendorAliasService) {}

  @Post()
  public create(@Body() data: CreateVendorAliasDto): Promise<VendorAlias> {
    return this.vendorAliasService.create(data);
  }

  @Get('vendor/:vendorId')
  public getByVendor(
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
  ): Promise<VendorAlias[]> {
    return this.vendorAliasService.getByVendor(vendorId);
  }

  @Delete(':id')
  public delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.vendorAliasService.delete(id);
  }
}
