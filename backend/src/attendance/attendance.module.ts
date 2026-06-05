import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { DailyCodeModule } from '../daily-code/daily-code.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [DailyCodeModule, SettingsModule],
  providers: [AttendanceService],
  controllers: [AttendanceController],
  exports: [AttendanceService],
})
export class AttendanceModule {}
