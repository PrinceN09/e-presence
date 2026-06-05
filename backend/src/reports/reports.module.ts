import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { AttendanceModule } from '../attendance/attendance.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [AttendanceModule, EmailModule],
  providers: [ReportsService],
  controllers: [ReportsController],
})
export class ReportsModule {}
