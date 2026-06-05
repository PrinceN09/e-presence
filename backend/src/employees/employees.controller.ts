import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  Res,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { EmployeesService, CreateEmployeeDto, UpdateEmployeeDto } from './employees.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private service: EmployeesService) {}

  @Roles('ADMIN')
  @Get()
  findAll(@Query('departmentId') departmentId?: string) {
    return this.service.findAll(departmentId);
  }

  @Roles('ADMIN')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreateEmployeeDto, @Request() req: any) {
    return this.service.create(dto, req.user?.sub);
  }

  @Roles('ADMIN')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto, @Request() req: any) {
    return this.service.update(id, dto, req.user?.sub);
  }

  @Roles('ADMIN')
  @Put(':id/toggle-active')
  toggleActive(@Param('id') id: string, @Request() req: any) {
    return this.service.toggleActive(id, req.user?.sub);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.service.remove(id, req.user?.sub);
  }

  @Roles('ADMIN')
  @Post(':id/reset-password')
  resetPassword(@Param('id') id: string) {
    return this.service.resetPassword(id);
  }

  @Roles('ADMIN')
  @Get('template')
  async downloadTemplate(@Res() res: Response) {
    const buffer = await this.service.generateTemplate();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="modele-import-employes.xlsx"',
    });
    res.send(buffer);
  }

  @Roles('ADMIN')
  @Post('import')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async importExcel(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
    return this.service.importFromExcel(file.buffer, req.user?.sub);
  }
}
