import { Injectable } from '@nestjs/common';
import { AttendanceService } from '../attendance/attendance.service';
import { EmailService } from '../email/email.service';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import * as ExcelJS from 'exceljs';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit');

@Injectable()
export class ReportsService {
  constructor(
    private attendanceService: AttendanceService,
    private emailService: EmailService,
  ) {}

  async sendReportByEmail(
    type: 'daily' | 'weekly' | 'monthly',
    date: string | undefined,
    format_: 'pdf' | 'excel',
    recipientEmail: string,
    recipientName: string,
  ) {
    const typeLabel = type === 'daily' ? 'Journalier' : type === 'weekly' ? 'Hebdomadaire' : 'Mensuel';
    const subject = `e-Présence — Rapport ${typeLabel}`;

    if (format_ === 'pdf') {
      const buffer = await this.generatePdf(type, date);
      const filename = `rapport-${type}-${date || 'today'}.pdf`;
      await this.emailService.sendReportByEmail(
        recipientEmail, recipientName, subject, filename,
        'application/pdf', buffer,
      );
    } else {
      const buffer = await this.generateExcel(type, date);
      const filename = `rapport-${type}-${date || 'today'}.xlsx`;
      await this.emailService.sendReportByEmail(
        recipientEmail, recipientName, subject, filename,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer,
      );
    }
    return { message: `Rapport envoyé à ${recipientEmail}` };
  }

  async generateExcel(
    type: 'daily' | 'weekly' | 'monthly',
    date?: string,
  ): Promise<Buffer> {
    const data = await this.attendanceService.getReportData(type, date);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Rapport de Présence');

    // Header styling
    const headerStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
      },
    };

    sheet.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Matricule', key: 'matricule', width: 14 },
      { header: 'Nom & Prénom', key: 'name', width: 28 },
      { header: 'Grade', key: 'grade', width: 10 },
      { header: 'Département', key: 'department', width: 22 },
      { header: 'Heure d\'arrivée', key: 'signIn', width: 16 },
      { header: 'Heure de départ', key: 'signOut', width: 16 },
      { header: 'Statut', key: 'status', width: 12 },
    ];

    sheet.getRow(1).eachCell((cell) => {
      Object.assign(cell, headerStyle);
    });
    sheet.getRow(1).height = 25;

    data.forEach((rec, i) => {
      const status = rec.status === 'PRESENT' ? 'Présent' : rec.status === 'LATE' ? 'En retard' : 'Absent';
      const row = sheet.addRow({
        date: format(new Date(rec.date), 'dd/MM/yyyy'),
        matricule: rec.employee.matricule,
        name: rec.employee.name,
        grade: rec.employee.grade,
        department: rec.employee.department?.name || '',
        signIn: rec.signInAt ? format(new Date(rec.signInAt), 'HH:mm') : '—',
        signOut: rec.signOutAt ? format(new Date(rec.signOutAt), 'HH:mm') : '—',
        status,
      });

      const fillColor =
        rec.status === 'PRESENT'
          ? 'FFE8F5E9'
          : rec.status === 'LATE'
          ? 'FFFFF3CD'
          : 'FFFDE0DC';

      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
        cell.alignment = { vertical: 'middle' };
        cell.border = {
          bottom: { style: 'hair', color: { argb: 'FFCCCCCC' } },
        };
      });
      row.height = 20;
    });

    // Summary row
    const present = data.filter((r) => r.status === 'PRESENT').length;
    const late = data.filter((r) => r.status === 'LATE').length;
    const absent = data.filter((r) => r.status === 'ABSENT').length;
    sheet.addRow([]);
    const summaryRow = sheet.addRow({
      date: 'TOTAL',
      matricule: '',
      name: `Présent: ${present} | Retard: ${late} | Absent: ${absent}`,
    });
    summaryRow.font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async generatePdf(
    type: 'daily' | 'weekly' | 'monthly',
    date?: string,
  ): Promise<Buffer> {
    const data = await this.attendanceService.getReportData(type, date);
    const ref = date ? new Date(date) : new Date();

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const primaryColor = '#1E3A5F';
      const accentColor = '#2E86AB';

      // Header
      doc.rect(0, 0, doc.page.width, 70).fill(primaryColor);
      doc.fillColor('white').fontSize(20).font('Helvetica-Bold')
        .text('e-Présence', 40, 18);
      doc.fontSize(12).font('Helvetica')
        .text(`Rapport ${type === 'daily' ? 'Journalier' : type === 'weekly' ? 'Hebdomadaire' : 'Mensuel'}`, 40, 42);
      doc.fontSize(10)
        .text(`Généré le: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, doc.page.width - 200, 42, { width: 160, align: 'right' });
      doc.text(`Période: ${format(ref, type === 'daily' ? 'dd MMMM yyyy' : type === 'weekly' ? "'Semaine du' dd MMM yyyy" : 'MMMM yyyy', { locale: fr })}`, 40, 55);

      // Stats
      const present = data.filter((r) => r.status === 'PRESENT').length;
      const late = data.filter((r) => r.status === 'LATE').length;
      const absent = data.filter((r) => r.status === 'ABSENT').length;
      const y = 90;

      [[`Présents`, present, '#4CAF50'], [`En retard`, late, '#FF9800'], [`Absents`, absent, '#F44336']].forEach(([label, count, color], i) => {
        const x = 40 + i * 120;
        doc.roundedRect(x, y, 110, 40, 5).fill(color as string);
        doc.fillColor('white').fontSize(18).font('Helvetica-Bold').text(String(count), x, y + 4, { width: 110, align: 'center' });
        doc.fontSize(9).font('Helvetica').text(label as string, x, y + 26, { width: 110, align: 'center' });
      });

      // Table
      const tableTop = 150;
      const headers = ['Date', 'Matricule', 'Nom & Prénom', 'Grade', 'Département', 'Arrivée', 'Départ', 'Statut'];
      const colWidths = [70, 70, 160, 50, 130, 55, 55, 60];
      let xPos = 40;

      doc.rect(40, tableTop, doc.page.width - 80, 20).fill(accentColor);
      doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
      headers.forEach((h, i) => {
        doc.text(h, xPos + 3, tableTop + 5, { width: colWidths[i] });
        xPos += colWidths[i];
      });

      let rowY = tableTop + 20;
      data.forEach((rec, idx) => {
        if (rowY > doc.page.height - 60) {
          doc.addPage({ layout: 'landscape' });
          rowY = 40;
        }
        const bg = idx % 2 === 0 ? '#F5F5F5' : '#FFFFFF';
        doc.rect(40, rowY, doc.page.width - 80, 18).fill(bg);

        const statusColor = rec.status === 'PRESENT' ? '#4CAF50' : rec.status === 'LATE' ? '#FF9800' : '#F44336';
        const statusText = rec.status === 'PRESENT' ? 'Présent' : rec.status === 'LATE' ? 'Retard' : 'Absent';
        const row = [
          format(new Date(rec.date), 'dd/MM/yy'),
          rec.employee.matricule,
          rec.employee.name,
          rec.employee.grade,
          rec.employee.department?.name || '',
          rec.signInAt ? format(new Date(rec.signInAt), 'HH:mm') : '—',
          rec.signOutAt ? format(new Date(rec.signOutAt), 'HH:mm') : '—',
          statusText,
        ];

        xPos = 40;
        doc.fillColor('#333333').fontSize(8).font('Helvetica');
        row.forEach((cell, i) => {
          if (i === row.length - 1) doc.fillColor(statusColor).font('Helvetica-Bold');
          doc.text(String(cell), xPos + 3, rowY + 4, { width: colWidths[i], ellipsis: true });
          if (i === row.length - 1) { doc.fillColor('#333333'); doc.font('Helvetica'); }
          xPos += colWidths[i];
        });
        rowY += 18;
      });

      doc.end();
    });
  }
}
