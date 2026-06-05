import { Module } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { EmailModule } from '../email/email.module';
import { ConfigModule } from '@nestjs/config';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [EmailModule, ConfigModule, AuditModule],
  providers: [EmployeesService],
  controllers: [EmployeesController],
  exports: [EmployeesService],
})
export class EmployeesModule {}
