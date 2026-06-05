import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import { EmailService } from '../email/email.service';
import { startOfDay } from 'date-fns';
import * as QRCode from 'qrcode';

@Injectable()
export class DailyCodeService {
  private readonly logger = new Logger(DailyCodeService.name);

  constructor(
    private prisma: PrismaService,
    private sms: SmsService,
    private email: EmailService,
    private config: ConfigService,
  ) {}

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  async getTodayCode() {
    const today = startOfDay(new Date());
    let record = await this.prisma.dailyCode.findUnique({ where: { date: today } });
    if (!record) record = await this.generateAndSave();
    return record;
  }

  private async generateAndSave() {
    const today = startOfDay(new Date());
    let code = this.generateCode();
    let attempts = 0;
    while (attempts < 10) {
      const exists = await this.prisma.dailyCode.findUnique({ where: { code } });
      if (!exists) break;
      code = this.generateCode();
      attempts++;
    }
    return this.prisma.dailyCode.upsert({
      where: { date: today },
      update: { code },
      create: { code, date: today },
    });
  }

  async getTodayQrPng(): Promise<Buffer> {
    const record = await this.getTodayCode();
    const frontendUrl = this.config.get('FRONTEND_URL') || 'http://localhost:3001';
    const url = `${frontendUrl}/employee/attend?code=${record.code}`;
    return QRCode.toBuffer(url, {
      errorCorrectionLevel: 'H',
      width: 400,
      margin: 2,
      color: { dark: '#1E3A5F', light: '#FFFFFF' },
    });
  }

  async validateCode(code: string): Promise<boolean> {
    const today = await this.getTodayCode();
    return today.code === code.toUpperCase();
  }

  async regenerateCode() {
    const today = startOfDay(new Date());
    await this.prisma.dailyCode.deleteMany({ where: { date: today } });
    const record = await this.generateAndSave();
    await this.broadcastCode(record.code);
    return record;
  }

  private async broadcastCode(code: string) {
    const employees = await this.prisma.employee.findMany({
      where: { isActive: true, role: 'EMPLOYEE' },
      select: { phone: true, email: true, name: true },
    });

    let smsSent = 0, emailSent = 0;

    for (const emp of employees) {
      // Send SMS
      const smsMsg = `e-Présence: Votre code de présence du jour est: ${code}. Valable uniquement aujourd'hui.`;
      await this.sms.send(emp.phone, smsMsg).catch((err) =>
        this.logger.error(`SMS failed to ${emp.phone}: ${err.message}`),
      );
      smsSent++;

      // Send Email
      if (emp.email) {
        await this.email.sendAttendanceCode(emp.email, emp.name, code).catch((err) =>
          this.logger.error(`Email failed to ${emp.email}: ${err.message}`),
        );
        emailSent++;
      }
    }

    this.logger.log(`Code ${code} sent — SMS: ${smsSent}, Email: ${emailSent}`);
  }

  // Auto-generate at 7:00 AM every weekday
  @Cron('0 7 * * 1-5')
  async scheduledGeneration() {
    this.logger.log('Generating daily attendance code...');
    const record = await this.generateAndSave();
    await this.broadcastCode(record.code);
  }

  async getHistory(limit = 30) {
    return this.prisma.dailyCode.findMany({
      orderBy: { date: 'desc' },
      take: limit,
    });
  }

  async sendCodeToEmployee(employeeId: string) {
    const code = await this.getTodayCode();
    const emp = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { phone: true, email: true, name: true },
    });
    if (!emp) return;

    await this.sms.send(
      emp.phone,
      `e-Présence: Bonjour ${emp.name}, votre code du jour est: ${code.code}`,
    ).catch(() => {});

    if (emp.email) {
      await this.email.sendAttendanceCode(emp.email, emp.name, code.code).catch(() => {});
    }

    return { message: 'Code sent via SMS and email' };
  }
}
