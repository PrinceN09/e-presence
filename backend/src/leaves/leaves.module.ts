import { Module } from '@nestjs/common';
import { LeavesService } from './leaves.service';
import { LeavesController } from './leaves.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [LeavesService],
  controllers: [LeavesController],
  exports: [LeavesService],
})
export class LeavesModule {}
