import {
  Get,
  Put,
  Post,
  Body,
  Param,
  Controller,
  ParseUUIDPipe,
} from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';
import { VendorService } from './vendor.service';
import { Vendor } from './entities/vendor.entity';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';

@ApiTags('vendor')
@Controller('vendor')
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  @Get()
  public getAll(): Promise<Vendor[]> {
    return this.vendorService.getAll();
  }

  @Post()
  public create(@Body() data: CreateVendorDto): Promise<Vendor> {
    return this.vendorService.create(data);
  }

  @Get(':id')
  public getById(@Param('id', ParseUUIDPipe) id: string): Promise<Vendor> {
    return this.vendorService.getById(id);
  }

  @Put(':id')
  public update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateVendorDto,
  ): Promise<Vendor> {
    return this.vendorService.update(id, data);
  }
}
