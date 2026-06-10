import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { HealthController } from './health.controller';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { EmployeesModule } from './employees/employees.module';
import { DepartmentsModule } from './departments/departments.module';
import { AttendanceModule } from './attendance/attendance.module';
import { DailyCodeModule } from './daily-code/daily-code.module';
import { ReportsModule } from './reports/reports.module';
import { SmsModule } from './sms/sms.module';
import { EmailModule } from './email/email.module';
import { SettingsModule } from './settings/settings.module';
import { LeavesModule } from './leaves/leaves.module';
import { PublicHolidaysModule } from './public-holidays/public-holidays.module';
import { AuditModule } from './audit/audit.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    EmployeesModule,
    DepartmentsModule,
    AttendanceModule,
    DailyCodeModule,
    ReportsModule,
    SmsModule,
    EmailModule,
    SettingsModule,
    LeavesModule,
    PublicHolidaysModule,
    AuditModule,
    NotificationsModule,
  ],
})
export class AppModule {}
