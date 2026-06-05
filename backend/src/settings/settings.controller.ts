import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { SettingsService, UpdateSettingsDto } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private service: SettingsService) {}

  @Get()
  get() {
    return this.service.get();
  }

  @Roles('ADMIN')
  @Put()
  update(@Body() dto: UpdateSettingsDto, @Request() req: any) {
    return this.service.update(dto, req.user?.sub);
  }
}
