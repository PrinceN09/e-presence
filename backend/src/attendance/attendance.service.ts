import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { DailyCodeService } from '../daily-code/daily-code.service';
import { SettingsService } from '../settings/settings.service';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns';
import { IsString, IsOptional, IsNumber } from 'class-validator';
import * as fs from 'fs';
import * as path from 'path';

export class SignInDto {
  @IsString() code: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @IsString() selfie?: string; // base64 data URL
}

export class AttendanceQueryDto {
  @IsOptional() @IsString() date?: string;
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
  @IsOptional() @IsString() departmentId?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() search?: string;
}

const SIGN_IN_CUTOFF = { hour: 8, minute: 30 }; // 08:30

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private dailyCodeService: DailyCodeService,
    private settingsService: SettingsService,
  ) {}

  private determineStatus(signInTime: Date): 'PRESENT' | 'LATE' {
    const cutoff = new Date(signInTime);
    cutoff.setHours(SIGN_IN_CUTOFF.hour, SIGN_IN_CUTOFF.minute, 0, 0);
    return signInTime <= cutoff ? 'PRESENT' : 'LATE';
  }

  async signIn(employeeId: string, dto: SignInDto) {
    const valid = await this.dailyCodeService.validateCode(dto.code);
    if (!valid) throw new BadRequestException('Code de présence invalide');

    // GPS check
    const settings = await this.settingsService.get();
    if (settings.officeLatitude && settings.officeLongitude) {
      if (dto.latitude == null || dto.longitude == null) {
        throw new BadRequestException('Localisation GPS requise');
      }
      const distance = this.settingsService.calculateDistance(
        dto.latitude, dto.longitude,
        settings.officeLatitude, settings.officeLongitude,
      );
      if (distance > settings.officeRadius) {
        throw new BadRequestException(
          `Vous êtes trop loin du bureau (${Math.round(distance)}m). Rayon autorisé: ${settings.officeRadius}m`,
        );
      }
    }

    const today = startOfDay(new Date());
    const existing = await this.prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    });
    if (existing?.signInAt) throw new BadRequestException('Déjà pointé aujourd\'hui');

    // Save selfie
    let selfieUrl: string | undefined;
    if (dto.selfie) {
      selfieUrl = await this.saveSelfie(employeeId, dto.selfie);
    }

    const now = new Date();
    const status = this.determineStatus(now);

    const record = await this.prisma.attendance.upsert({
      where: { employeeId_date: { employeeId, date: today } },
      update: { signInAt: now, status, selfieUrl, latitude: dto.latitude, longitude: dto.longitude },
      create: { employeeId, date: today, signInAt: now, status, selfieUrl, latitude: dto.latitude, longitude: dto.longitude },
      include: { employee: { select: { name: true, matricule: true } } },
    });

    return {
      ...record,
      message: status === 'PRESENT' ? 'Présence enregistrée ✓' : 'Présence enregistrée — En retard',
    };
  }

  private async saveSelfie(employeeId: string, dataUrl: string): Promise<string> {
    try {
      const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      const uploadsDir = path.join(process.cwd(), 'uploads', 'selfies');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const filename = `${employeeId}_${Date.now()}.jpg`;
      fs.writeFileSync(path.join(uploadsDir, filename), Buffer.from(base64, 'base64'));
      return `/uploads/selfies/${filename}`;
    } catch {
      return '';
    }
  }

  async signOut(employeeId: string) {
    const today = startOfDay(new Date());
    const record = await this.prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    });

    if (!record?.signInAt) throw new BadRequestException('Vous n\'avez pas pointé aujourd\'hui');
    if (record.signOutAt) throw new BadRequestException('Départ déjà enregistré aujourd\'hui');

    return this.prisma.attendance.update({
      where: { employeeId_date: { employeeId, date: today } },
      data: { signOutAt: new Date() },
      include: { employee: { select: { name: true } } },
    });
  }

  async lunchOut(employeeId: string) {
    const today = startOfDay(new Date());
    const record = await this.prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    });
    if (!record?.signInAt) throw new BadRequestException('Vous n\'avez pas pointé aujourd\'hui');
    if ((record as any).lunchOutAt) throw new BadRequestException('Sortie déjeuner déjà enregistrée');

    return this.prisma.attendance.update({
      where: { employeeId_date: { employeeId, date: today } },
      data: { lunchOutAt: new Date() } as any,
    });
  }

  async lunchIn(employeeId: string) {
    const today = startOfDay(new Date());
    const record = await this.prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    });
    if (!(record as any)?.lunchOutAt) throw new BadRequestException('Sortie déjeuner non enregistrée');
    if ((record as any).lunchInAt) throw new BadRequestException('Retour déjeuner déjà enregistré');

    return this.prisma.attendance.update({
      where: { employeeId_date: { employeeId, date: today } },
      data: { lunchInAt: new Date() } as any,
    });
  }

  async getEmployeeProfile(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true, name: true, matricule: true, grade: true, gradeLabel: true,
        phone: true, email: true, role: true, isActive: true,
        department: { select: { id: true, name: true } },
        createdAt: true,
      },
    });
    if (!employee) throw new BadRequestException('Employé introuvable');

    const attendances = await this.prisma.attendance.findMany({
      where: { employeeId },
      orderBy: { date: 'desc' },
      take: 120,
    });

    return { employee, attendances };
  }

  async getMyAttendance(employeeId: string, query: AttendanceQueryDto) {
    const where = await this.buildWhere({ ...query, employeeId });
    return this.prisma.attendance.findMany({
      where,
      orderBy: { date: 'desc' },
      take: 90,
    });
  }

  async getTodayStatus(employeeId: string) {
    const today = startOfDay(new Date());
    const record = await this.prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    });
    return {
      date: today,
      signedIn: !!record?.signInAt,
      signedOut: !!record?.signOutAt,
      status: record?.status || 'ABSENT',
      signInAt: record?.signInAt,
      signOutAt: record?.signOutAt,
      lunchOutAt: (record as any)?.lunchOutAt ?? null,
      lunchInAt: (record as any)?.lunchInAt ?? null,
    };
  }

  // ADMIN
  async getAll(query: AttendanceQueryDto) {
    const where = await this.buildWhere(query);
    return this.prisma.attendance.findMany({
      where,
      include: {
        employee: {
          select: {
            name: true,
            matricule: true,
            grade: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: [{ date: 'desc' }, { signInAt: 'asc' }],
    });
  }

  async getDashboardStats() {
    const today = startOfDay(new Date());

    const [totalActive, todayRecords] = await Promise.all([
      this.prisma.employee.count({ where: { isActive: true, role: 'EMPLOYEE' } }),
      this.prisma.attendance.findMany({
        where: { date: today },
        select: { status: true },
      }),
    ]);

    const present = todayRecords.filter((r) => r.status === 'PRESENT').length;
    const late = todayRecords.filter((r) => r.status === 'LATE').length;
    const absent = totalActive - present - late;

    return {
      totalEmployees: totalActive,
      present,
      late,
      absent: Math.max(absent, 0),
      date: format(today, 'yyyy-MM-dd'),
    };
  }

  private async buildWhere(query: AttendanceQueryDto & { employeeId?: string }) {
    const where: any = {};

    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.status) where.status = query.status;

    if (query.date) {
      const d = new Date(query.date);
      where.date = { gte: startOfDay(d), lte: endOfDay(d) };
    } else if (query.startDate && query.endDate) {
      where.date = {
        gte: startOfDay(new Date(query.startDate)),
        lte: endOfDay(new Date(query.endDate)),
      };
    }

    if (query.departmentId) {
      where.employee = { departmentId: query.departmentId };
    }

    if (query.search) {
      where.employee = {
        ...where.employee,
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { matricule: { contains: query.search, mode: 'insensitive' } },
        ],
      };
    }

    return where;
  }

  async getReportData(type: 'daily' | 'weekly' | 'monthly', date?: string) {
    const ref = date ? new Date(date) : new Date();
    let start: Date, end: Date;

    if (type === 'daily') {
      start = startOfDay(ref);
      end = endOfDay(ref);
    } else if (type === 'weekly') {
      start = startOfWeek(ref, { weekStartsOn: 1 });
      end = endOfWeek(ref, { weekStartsOn: 1 });
    } else {
      start = startOfMonth(ref);
      end = endOfMonth(ref);
    }

    return this.prisma.attendance.findMany({
      where: { date: { gte: start, lte: end } },
      include: {
        employee: {
          select: {
            name: true,
            matricule: true,
            grade: true,
            gradeLabel: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: [{ date: 'asc' }, { employee: { name: 'asc' } }],
    });
  }

  // ─── Selfie cleanup ───────────────────────────────────────────────
  // Runs every day at 02:00. Deletes selfie files and clears the DB
  // field for any attendance record older than 15 days.
  private readonly logger = new Logger(AttendanceService.name);

  @Cron('0 2 * * *') // 02:00 every night
  async cleanupOldSelfies() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 15);

    const old = await this.prisma.attendance.findMany({
      where: {
        date: { lt: cutoff },
        selfieUrl: { not: null },
      },
      select: { id: true, selfieUrl: true },
    });

    let deleted = 0;
    for (const record of old) {
      // Delete the file from disk if it exists
      if (record.selfieUrl && !record.selfieUrl.startsWith('data:')) {
        const filePath = path.join(process.cwd(), 'uploads', path.basename(record.selfieUrl));
        fs.unlink(filePath, () => {}); // non-blocking, ignore errors
      }
    }

    if (old.length > 0) {
      await this.prisma.attendance.updateMany({
        where: { date: { lt: cutoff }, selfieUrl: { not: null } },
        data: { selfieUrl: null },
      });
      deleted = old.length;
    }

    if (deleted > 0) {
      this.logger.log(`Selfie cleanup: cleared ${deleted} photo(s) older than 15 days`);
    }
  }
}
