import { Module } from '@nestjs/common';
import { PublicHolidaysService } from './public-holidays.service';
import { PublicHolidaysController } from './public-holidays.controller';

@Module({
  providers: [PublicHolidaysService],
  controllers: [PublicHolidaysController],
  exports: [PublicHolidaysService],
})
export class PublicHolidaysModule {}
