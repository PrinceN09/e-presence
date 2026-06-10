import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { startOfDay } from 'date-fns';

export const LEAVE_TYPE_LABELS: Record<string, string> = {
  MATERNITY: 'Congé maternité',
  SICK:      'Congé maladie',
  PERSONAL:  'Congé personnel',
  VACATION:  'Congé annuel',
  MISSION:   'Mission / Déplacement',
};

@Injectable()
export class LeavesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notifications: NotificationsService,
  ) {}

  private includeEmployee = {
    employee: { select: { id: true, name: true, matricule: true, department: { select: { name: true } } } },
  };

  /** Employee creates a leave request */
  async create(employeeId: string, dto: { type: string; startDate: string; endDate: string; reason?: string }) {
    const start = startOfDay(new Date(dto.startDate));
    const end   = startOfDay(new Date(dto.endDate));
    if (end < start) throw new BadRequestException('La date de fin doit être après la date de début');

    const leave = await this.prisma.leaveRequest.create({
      data: {
        employeeId,
        type:      dto.type as any,
        startDate: start,
        endDate:   end,
        reason:    dto.reason,
      },
      include: this.includeEmployee,
    });

    // Notify all admins
    const typeLabel = LEAVE_TYPE_LABELS[dto.type] || dto.type;
    const empName = (leave.employee as any).name;
    this.notifications.createForAllAdmins({
      type: 'LEAVE_REQUEST',
      title: 'Nouvelle demande de congé',
      message: `${empName} a soumis une demande de ${typeLabel.toLowerCase()}.`,
      link: '/admin/leaves',
    }).catch(() => {});

    return leave;
  }

  /** Employee's own requests */
  async myRequests(employeeId: string) {
    return this.prisma.leaveRequest.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
      include: this.includeEmployee,
    });
  }

  /** Admin: all requests, optionally filtered by status */
  async findAll(status?: string) {
    return this.prisma.leaveRequest.findMany({
      where: status ? { status: status as any } : undefined,
      orderBy: { createdAt: 'desc' },
      include: this.includeEmployee,
    });
  }

  /** Admin: all requests for one employee */
  async findByEmployee(employeeId: string) {
    return this.prisma.leaveRequest.findMany({
      where: { employeeId },
      orderBy: { startDate: 'desc' },
      include: this.includeEmployee,
    });
  }

  /** Admin approves or rejects */
  async review(id: string, status: 'APPROVED' | 'REJECTED', adminNote?: string, adminId?: string) {
    const req = await this.prisma.leaveRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Demande introuvable');

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: { status, adminNote },
      include: this.includeEmployee,
    });

    this.audit.log({ action: `LEAVE_${status}`, entity: 'LeaveRequest', entityId: id, adminId, details: { employeeId: req.employeeId, type: req.type, adminNote } });

    // Notify the employee
    const typeLabel = LEAVE_TYPE_LABELS[req.type] || req.type;
    const isApproved = status === 'APPROVED';
    this.notifications.create({
      employeeId: req.employeeId,
      type: `LEAVE_${status}`,
      title: isApproved ? 'Congé approuvé ✓' : 'Congé refusé',
      message: isApproved
        ? `Votre demande de ${typeLabel.toLowerCase()} a été approuvée.`
        : `Votre demande de ${typeLabel.toLowerCase()} a été refusée.${adminNote ? ` Motif : ${adminNote}` : ''}`,
      link: '/employee',
    }).catch(() => {});

    return updated;
  }

  /** Admin can also create directly (bypass approval) */
  async adminCreate(dto: { employeeId: string; type: string; startDate: string; endDate: string; reason?: string }) {
    const start = startOfDay(new Date(dto.startDate));
    const end   = startOfDay(new Date(dto.endDate));
    return this.prisma.leaveRequest.create({
      data: {
        employeeId: dto.employeeId,
        type:       dto.type as any,
        startDate:  start,
        endDate:    end,
        reason:     dto.reason,
        status:     'APPROVED',
      },
      include: this.includeEmployee,
    });
  }

  async remove(id: string) {
    await this.prisma.leaveRequest.findUniqueOrThrow({ where: { id } });
    await this.prisma.leaveRequest.delete({ where: { id } });
    return { message: 'Demande supprimée' };
  }

  /** Check if a given date is a leave day for an employee (approved) */
  async getActiveLeaveForDate(employeeId: string, date: Date) {
    return this.prisma.leaveRequest.findFirst({
      where: {
        employeeId,
        status: 'APPROVED',
        startDate: { lte: date },
        endDate:   { gte: date },
      },
    });
  }
}
