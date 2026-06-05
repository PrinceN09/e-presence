import { Module } from '@nestjs/common';
import { DailyCodeService } from './daily-code.service';
import { DailyCodeController } from './daily-code.controller';
import { SmsModule } from '../sms/sms.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [SmsModule, EmailModule],
  providers: [DailyCodeService],
  controllers: [DailyCodeController],
  exports: [DailyCodeService],
})
export class DailyCodeModule {}
