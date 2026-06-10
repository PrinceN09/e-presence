import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    employeeId: string;
    type: string;
    title: string;
    message: string;
    link?: string;
  }) {
    return this.prisma.notification.create({ data });
  }

  async createForAllAdmins(data: {
    type: string;
    title: string;
    message: string;
    link?: string;
  }) {
    const admins = await this.prisma.employee.findMany({
      where: { role: 'ADMIN', isActive: true },
      select: { id: true },
    });
    await Promise.all(
      admins.map((a) => this.create({ employeeId: a.id, ...data })),
    );
  }

  async findForEmployee(employeeId: string) {
    return this.prisma.notification.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async unreadCount(employeeId: string) {
    return this.prisma.notification.count({
      where: { employeeId, read: false },
    });
  }

  async markRead(id: string, employeeId: string) {
    return this.prisma.notification.updateMany({
      where: { id, employeeId },
      data: { read: true },
    });
  }

  async markAllRead(employeeId: string) {
    return this.prisma.notification.updateMany({
      where: { employeeId, read: false },
      data: { read: true },
    });
  }
}
