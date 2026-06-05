import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { DepartmentsService, CreateDepartmentDto } from './departments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Departments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private service: DepartmentsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreateDepartmentDto) {
    return this.service.create(dto);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: CreateDepartmentDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
