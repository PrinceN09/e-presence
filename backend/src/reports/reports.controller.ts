import { Controller, Get, Post, Body, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('reports')
export class ReportsController {
  constructor(private service: ReportsService) {}

  @Get('excel')
  async excel(
    @Query('type') type: 'daily' | 'weekly' | 'monthly' = 'daily',
    @Query('date') date: string,
    @Res() res: Response,
  ) {
    const buffer = await this.service.generateExcel(type, date);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="rapport-${type}-${date || 'today'}.xlsx"`,
    });
    res.send(buffer);
  }

  @Post('send-email')
  async sendByEmail(
    @Body() body: { type: 'daily' | 'weekly' | 'monthly'; date?: string; format: 'pdf' | 'excel'; recipientEmail: string; recipientName: string },
  ) {
    return this.service.sendReportByEmail(body.type, body.date, body.format, body.recipientEmail, body.recipientName);
  }

  @Get('pdf')
  async pdf(
    @Query('type') type: 'daily' | 'weekly' | 'monthly' = 'daily',
    @Query('date') date: string,
    @Res() res: Response,
  ) {
    const buffer = await this.service.generatePdf(type, date);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="rapport-${type}-${date || 'today'}.pdf"`,
    });
    res.send(buffer);
  }
}
