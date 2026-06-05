import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const ACTION_LABELS: Record<string, string> = {
  CREATE_EMPLOYEE:     'Création employé',
  UPDATE_EMPLOYEE:     'Modif. employé',
  DELETE_EMPLOYEE:     'Suppression employé',
  ACTIVATE_EMPLOYEE:   'Activation',
  DEACTIVATE_EMPLOYEE: 'Désactivation',
  IMPORT_EMPLOYEES:    'Import Excel',
  LEAVE_APPROVED:      'Congé approuvé',
  LEAVE_REJECTED:      'Congé refusé',
  UPDATE_SETTINGS:     'Paramètres modifiés',
};

export interface AuditParams {
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, any>;
  adminId?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: AuditParams) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
          details: params.details ?? {},
          adminId: params.adminId,
        },
      });
    } catch {
      // Audit logging should never break the main flow
    }
  }

  async findAll(filters: { from?: string; to?: string; action?: string; adminId?: string; limit?: number }) {
    const where: any = {};
    if (filters.action) where.action = { contains: filters.action, mode: 'insensitive' };
    if (filters.adminId) where.adminId = filters.adminId;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) where.createdAt.lte = new Date(filters.to + 'T23:59:59');
    }

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.limit ?? 200,
      include: {
        admin: { select: { name: true, matricule: true } },
      },
    });
  }

  async generatePdf(filters: { from?: string; to?: string; action?: string; limit?: number }): Promise<Buffer> {
    const logs = await this.findAll(filters);
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));

    const finish = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

    const navy = '#1E3A5F';
    const gray = '#6B7280';
    const lightGray = '#F3F4F6';

    // Header
    doc.rect(0, 0, doc.page.width, 60).fill(navy);
    doc.fillColor('white').fontSize(18).font('Helvetica-Bold').text("Journal d'audit — e-Présence", 40, 18);
    const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    doc.fontSize(10).font('Helvetica').text(`Généré le ${now}`, 40, 40);

    // Filter summary
    doc.fillColor(gray).fontSize(9).font('Helvetica');
    let filterLine = `${logs.length} entrée(s)`;
    if (filters.from || filters.to) filterLine += ` · Période: ${filters.from || '…'} → ${filters.to || '…'}`;
    if (filters.action) filterLine += ` · Action: ${ACTION_LABELS[filters.action] ?? filters.action}`;
    doc.text(filterLine, 40, 70);

    // Table
    const tableTop = 90;
    const colX = [40, 155, 285, 360, 460, 560];
    const headers = ['Date & Heure', 'Action', 'Entité', 'Effectué par', 'Matricule', 'Détails'];

    // Header row
    doc.rect(40, tableTop, doc.page.width - 80, 18).fill('#E5E7EB');
    doc.fillColor('#374151').fontSize(8).font('Helvetica-Bold');
    headers.forEach((h, i) => doc.text(h, colX[i], tableTop + 5, { width: (colX[i + 1] ?? doc.page.width - 40) - colX[i] - 4 }));

    let y = tableTop + 18;
    const rowH = 16;

    for (const log of logs) {
      if (y + rowH > doc.page.height - 40) {
        doc.addPage({ layout: 'landscape' });
        y = 40;
        doc.rect(40, y, doc.page.width - 80, 18).fill('#E5E7EB');
        doc.fillColor('#374151').fontSize(8).font('Helvetica-Bold');
        headers.forEach((h, i) => doc.text(h, colX[i], y + 5, { width: (colX[i + 1] ?? doc.page.width - 40) - colX[i] - 4 }));
        y += 18;
      }

      const rowIdx = logs.indexOf(log);
      if (rowIdx % 2 === 1) doc.rect(40, y, doc.page.width - 80, rowH).fill(lightGray);

      const dt = new Date(log.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      const actionLabel = ACTION_LABELS[log.action] ?? log.action;
      const adminName = (log as any).admin?.name ?? 'Système';
      const adminMat = (log as any).admin?.matricule ?? '—';
      const details = log.details ? JSON.stringify(log.details).slice(0, 60) : '—';

      doc.fillColor('#111827').fontSize(7.5).font('Helvetica');
      doc.text(dt,          colX[0], y + 4, { width: colX[1] - colX[0] - 4 });
      doc.text(actionLabel, colX[1], y + 4, { width: colX[2] - colX[1] - 4 });
      doc.text(log.entity,  colX[2], y + 4, { width: colX[3] - colX[2] - 4 });
      doc.text(adminName,   colX[3], y + 4, { width: colX[4] - colX[3] - 4 });
      doc.text(adminMat,    colX[4], y + 4, { width: colX[5] - colX[4] - 4 });
      doc.text(details,     colX[5], y + 4, { width: doc.page.width - 40 - colX[5] - 4 });

      y += rowH;
    }

    // Footer
    doc.fillColor(gray).fontSize(8).font('Helvetica')
      .text('e-Présence — Confidentiel', 40, doc.page.height - 30, { align: 'center', width: doc.page.width - 80 });

    doc.end();
    return finish;
  }
}
