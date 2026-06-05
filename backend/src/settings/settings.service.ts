import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional() @IsNumber() officeLatitude?: number;
  @IsOptional() @IsNumber() officeLongitude?: number;
  @IsOptional() @IsNumber() @Min(50) officeRadius?: number;
  @IsOptional() @IsString() officeName?: string;
}

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async get() {
    let setting = await this.prisma.setting.findFirst();
    if (!setting) {
      setting = await this.prisma.setting.create({ data: {} });
    }
    return setting;
  }

  async update(dto: UpdateSettingsDto, adminId?: string) {
    const setting = await this.get();
    const updated = await this.prisma.setting.update({
      where: { id: setting.id },
      data: dto,
    });
    this.audit.log({ action: 'UPDATE_SETTINGS', entity: 'Setting', entityId: setting.id, adminId, details: dto });
    return updated;
  }

  // Calculate distance between two GPS points in metres (Haversine formula)
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
