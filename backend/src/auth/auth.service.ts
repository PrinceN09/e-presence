import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { addDays, addHours } from 'date-fns';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private emailService: EmailService,
  ) {}

  async validateEmployee(matricule: string, password: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { matricule },
      include: { department: true },
    });
    if (!employee || !employee.isActive) return null;
    const valid = await bcrypt.compare(password, employee.password);
    if (!valid) return null;
    return employee;
  }

  async login(employee: any) {
    const payload = {
      sub: employee.id,
      matricule: employee.matricule,
      role: employee.role,
      tokenVersion: employee.tokenVersion ?? 0,
    };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = uuidv4();

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        employeeId: employee.id,
        expiresAt: addDays(new Date(), 7),
      },
    });

    return {
      accessToken,
      refreshToken,
      mustChangePassword: employee.firstLogin === true,
      employee: {
        id: employee.id,
        matricule: employee.matricule,
        name: employee.name,
        grade: employee.grade,
        gradeLabel: employee.gradeLabel,
        role: employee.role,
        department: employee.department?.name,
      },
    };
  }

  async refreshTokens(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { employee: { include: { department: true } } },
    });

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await this.prisma.refreshToken.delete({ where: { id: stored.id } });
      }
      throw new ForbiddenException('Invalid or expired refresh token');
    }

    // Rotate refresh token
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    return this.login(stored.employee);
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken
      .delete({ where: { token: refreshToken } })
      .catch(() => {});
    return { message: 'Logged out successfully' };
  }

  async changePassword(employeeId: string, currentPassword: string, newPassword: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new UnauthorizedException();
    const valid = await bcrypt.compare(currentPassword, employee.password);
    if (!valid) throw new UnauthorizedException('Mot de passe actuel incorrect');
    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.employee.update({
      where: { id: employeeId },
      data: { password: hashed, firstLogin: false },
    });
    return { message: 'Mot de passe modifié avec succès' };
  }

  async forgotPassword(email: string) {
    const employee = await this.prisma.employee.findFirst({ where: { email } });
    // Always return success to not leak whether email exists
    if (!employee) return { message: 'Si cet email existe, un lien a été envoyé.' };

    // Invalidate old tokens
    await this.prisma.passwordResetToken.deleteMany({ where: { employeeId: employee.id } });

    const rawToken = uuidv4();
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    await this.prisma.passwordResetToken.create({
      data: {
        token: hashedToken,
        employeeId: employee.id,
        expiresAt: addHours(new Date(), 2),
      },
    });

    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${rawToken}`;
    await this.emailService.sendPasswordReset(employee.email!, employee.name, resetLink);
    return { message: 'Si cet email existe, un lien a été envoyé.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const record = await this.prisma.passwordResetToken.findUnique({ where: { token: hashedToken } });
    if (!record || record.used || record.expiresAt < new Date()) {
      throw new BadRequestException('Lien invalide ou expiré');
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.employee.update({
      where: { id: record.employeeId },
      data: { password: hashed, firstLogin: false },
    });
    await this.prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { used: true },
    });
    return { message: 'Mot de passe réinitialisé avec succès' };
  }

  async sendWelcomeEmail(employee: { email: string | null; name: string; matricule: string }) {
    if (!employee.email) return;
    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    await this.emailService.sendWelcome(employee.email, employee.name, employee.matricule, frontendUrl);
  }
}
