import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AttendanceService, SignInDto, AttendanceQueryDto } from './attendance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private service: AttendanceService) {}

  // Employee routes
  @Post('sign-in')
  signIn(@Request() req: any, @Body() dto: SignInDto) {
    return this.service.signIn(req.user.sub, dto);
  }

  @Post('sign-out')
  signOut(@Request() req: any) {
    return this.service.signOut(req.user.sub);
  }

  @Post('lunch-out')
  lunchOut(@Request() req: any) {
    return this.service.lunchOut(req.user.sub);
  }

  @Post('lunch-in')
  lunchIn(@Request() req: any) {
    return this.service.lunchIn(req.user.sub);
  }

  @Get('my')
  getMyAttendance(@Request() req: any, @Query() query: AttendanceQueryDto) {
    return this.service.getMyAttendance(req.user.sub, query);
  }

  @Get('today-status')
  getTodayStatus(@Request() req: any) {
    return this.service.getTodayStatus(req.user.sub);
  }

  // Admin routes
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get()
  getAll(@Query() query: AttendanceQueryDto) {
    return this.service.getAll(query);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get('dashboard')
  getDashboard() {
    return this.service.getDashboardStats();
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get('employee/:employeeId/profile')
  getEmployeeProfile(@Param('employeeId') employeeId: string) {
    return this.service.getEmployeeProfile(employeeId);
  }
}
