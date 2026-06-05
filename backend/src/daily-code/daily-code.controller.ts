import { Controller, Get, Post, Param, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { DailyCodeService } from './daily-code.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Daily Code')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('daily-code')
export class DailyCodeController {
  constructor(private service: DailyCodeService) {}

  @Roles('ADMIN')
  @Get('today')
  getToday() {
    return this.service.getTodayCode();
  }

  @Roles('ADMIN')
  @Get('history')
  getHistory() {
    return this.service.getHistory();
  }

  @Roles('ADMIN')
  @Get('qr')
  async getQr(@Res() res: Response) {
    const png = await this.service.getTodayQrPng();
    res.set({ 'Content-Type': 'image/png' });
    res.send(png);
  }

  @Roles('ADMIN')
  @Post('regenerate')
  regenerate() {
    return this.service.regenerateCode();
  }

  @Roles('ADMIN')
  @Post('send/:employeeId')
  sendToEmployee(@Param('employeeId') employeeId: string) {
    return this.service.sendCodeToEmployee(employeeId);
  }
}
