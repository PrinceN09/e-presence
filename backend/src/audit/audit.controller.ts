import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('audit-logs')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  findAll(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('action') action?: string,
    @Query('adminId') adminId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.findAll({
      from,
      to,
      action,
      adminId,
      limit: limit ? parseInt(limit) : 200,
    });
  }

  @Get('pdf')
  async downloadPdf(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('action') action?: string,
    @Query('limit') limit?: string,
    @Res() res?: Response,
  ) {
    const buffer = await this.auditService.generatePdf({
      from,
      to,
      action,
      limit: limit ? parseInt(limit) : 500,
    });
    const date = new Date().toISOString().split('T')[0];
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="journal-audit-${date}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
