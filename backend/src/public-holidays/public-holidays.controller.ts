import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { PublicHolidaysService } from './public-holidays.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Public Holidays')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('public-holidays')
export class PublicHolidaysController {
  constructor(private service: PublicHolidaysService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Roles('ADMIN')
  @Post()
  create(@Body() body: { name: string; date: string; recurring?: boolean }) {
    return this.service.create(body);
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(id, body);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
