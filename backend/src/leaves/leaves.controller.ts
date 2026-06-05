import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { LeavesService } from './leaves.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Leaves')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leaves')
export class LeavesController {
  constructor(private service: LeavesService) {}

  /** Employee: submit a leave request */
  @Post()
  create(@Request() req: any, @Body() body: any) {
    return this.service.create(req.user.sub, body);
  }

  /** Employee: my requests */
  @Get('my')
  myRequests(@Request() req: any) {
    return this.service.myRequests(req.user.sub);
  }

  /** Admin: all requests */
  @Roles('ADMIN')
  @Get()
  findAll(@Query('status') status?: string) {
    return this.service.findAll(status);
  }

  /** Admin: requests for a specific employee */
  @Roles('ADMIN')
  @Get('employee/:employeeId')
  findByEmployee(@Param('employeeId') employeeId: string) {
    return this.service.findByEmployee(employeeId);
  }

  /** Admin: approve or reject */
  @Roles('ADMIN')
  @Patch(':id/review')
  review(@Param('id') id: string, @Body() body: { status: 'APPROVED' | 'REJECTED'; adminNote?: string }, @Request() req: any) {
    return this.service.review(id, body.status, body.adminNote, req.user?.sub);
  }

  /** Admin: create approved leave directly */
  @Roles('ADMIN')
  @Post('admin')
  adminCreate(@Body() body: any) {
    return this.service.adminCreate(body);
  }

  /** Admin: delete a request */
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
