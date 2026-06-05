import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import * as ExcelJS from 'exceljs';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../audit/audit.service';

export class CreateEmployeeDto {
  @IsString() matricule: string;
  @IsString() name: string;
  @IsString() grade: string;
  @IsOptional() @IsString() gradeLabel?: string;
  @IsString() phone: string;
  @IsOptional() @IsString() email?: string;
  @IsString() departmentId: string;
  @IsOptional() @IsString() password?: string;
  @IsOptional() @IsEnum(['EMPLOYEE', 'ADMIN']) role?: 'EMPLOYEE' | 'ADMIN';
}

export class UpdateEmployeeDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() grade?: string;
  @IsOptional() @IsString() gradeLabel?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() departmentId?: string;
  @IsOptional() @IsEnum(['EMPLOYEE', 'ADMIN']) role?: 'EMPLOYEE' | 'ADMIN';
}

@Injectable()
export class EmployeesService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private config: ConfigService,
    private audit: AuditService,
  ) {}

  private select = {
    id: true,
    matricule: true,
    name: true,
    grade: true,
    gradeLabel: true,
    phone: true,
    email: true,
    role: true,
    isActive: true,
    createdAt: true,
    department: { select: { id: true, name: true } },
    password: false,
  };

  async findAll(departmentId?: string) {
    return this.prisma.employee.findMany({
      where: departmentId ? { departmentId } : undefined,
      select: this.select,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const emp = await this.prisma.employee.findUnique({
      where: { id },
      select: this.select,
    });
    if (!emp) throw new NotFoundException('Employee not found');
    return emp;
  }

  async create(dto: CreateEmployeeDto, adminId?: string) {
    const existing = await this.prisma.employee.findFirst({
      where: {
        OR: [
          { matricule: dto.matricule },
          { phone: dto.phone },
          ...(dto.email ? [{ email: dto.email }] : []),
        ],
      },
    });
    if (existing) {
      throw new ConflictException(
        existing.matricule === dto.matricule
          ? 'Matricule already exists'
          : existing.phone === dto.phone
          ? 'Phone number already registered'
          : 'Email already registered',
      );
    }

    const password = await bcrypt.hash(dto.password || dto.matricule, 10);
    const created = await this.prisma.employee.create({
      data: {
        matricule: dto.matricule,
        name: dto.name,
        grade: dto.grade,
        gradeLabel: dto.gradeLabel || undefined,
        phone: dto.phone,
        email: dto.email || null,
        password,
        role: dto.role || 'EMPLOYEE',
        departmentId: dto.departmentId,
      },
      select: this.select,
    });
    this.audit.log({ action: 'CREATE_EMPLOYEE', entity: 'Employee', entityId: created.id, adminId, details: { matricule: dto.matricule, name: dto.name } });
    // Send welcome email (non-blocking)
    if (dto.email) {
      const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      this.emailService.sendWelcome(dto.email, dto.name, dto.matricule, frontendUrl).catch(() => {});
    }
    return created;
  }

  async update(id: string, dto: UpdateEmployeeDto, adminId?: string) {
    const before = await this.findOne(id);
    const updated = await this.prisma.employee.update({
      where: { id },
      data: dto,
      select: this.select,
    });
    this.audit.log({ action: 'UPDATE_EMPLOYEE', entity: 'Employee', entityId: id, adminId, details: { changes: dto, employeeName: (before as any).name } });
    return updated;
  }

  async toggleActive(id: string, adminId?: string) {
    const emp = await this.findOne(id);
    const newActive = !(emp as any).isActive;
    const updated = await this.prisma.employee.update({
      where: { id },
      data: { isActive: newActive, ...(newActive ? {} : { tokenVersion: { increment: 1 } }) },
      select: this.select,
    });
    this.audit.log({ action: newActive ? 'ACTIVATE_EMPLOYEE' : 'DEACTIVATE_EMPLOYEE', entity: 'Employee', entityId: id, adminId, details: { employeeName: (emp as any).name } });
    return updated;
  }

  async remove(id: string, adminId?: string) {
    const emp = await this.findOne(id);
    this.audit.log({ action: 'DELETE_EMPLOYEE', entity: 'Employee', entityId: id, adminId, details: { matricule: (emp as any).matricule, name: (emp as any).name } });
    await this.prisma.employee.delete({ where: { id } });
    return { message: 'Employee removed' };
  }

  async generateTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    // Main sheet
    const sheet = workbook.addWorksheet('Employés');
    const headerStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
    };
    sheet.columns = [
      { header: 'Matricule *', key: 'matricule', width: 16 },
      { header: 'Nom & Prénom *', key: 'name', width: 30 },
      { header: 'Grade *', key: 'grade', width: 10 },
      { header: 'Libellé Grade', key: 'gradeLabel', width: 35 },
      { header: 'Téléphone *', key: 'phone', width: 18 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Département *', key: 'department', width: 25 },
    ];
    sheet.getRow(1).eachCell((cell) => { Object.assign(cell, headerStyle); });
    sheet.getRow(1).height = 22;

    // Example rows
    const examples = [
      { matricule: '1.642.394', name: 'Odia Tshimanga Dorcas', grade: '200', gradeLabel: 'ATA2 — Attaché de second degré', phone: '+243810000001', email: '', department: 'Division Unique' },
      { matricule: '1.642.395', name: 'Mbaya Lukusa Jean', grade: '150', gradeLabel: 'AT1 — Attaché de premier degré', phone: '+243810000002', email: 'mbaya@example.com', department: 'Division Administrative' },
    ];
    examples.forEach((row, i) => {
      const r = sheet.addRow(row);
      r.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FFF0F4F8' : 'FFFFFFFF' } };
      });
    });

    // Note row
    sheet.addRow([]);
    const note = sheet.addRow(['* Champs obligatoires. Le mot de passe initial = Matricule. Département doit correspondre exactement au nom dans l\'application.']);
    note.getCell(1).font = { italic: true, color: { argb: 'FF888888' } };
    sheet.mergeCells(`A${note.number}:G${note.number}`);

    // Departments reference sheet
    const depts = await this.prisma.department.findMany({ orderBy: { name: 'asc' } });
    const deptSheet = workbook.addWorksheet('Départements');
    deptSheet.columns = [{ header: 'Nom du département', key: 'name', width: 35 }];
    deptSheet.getRow(1).eachCell((cell) => { Object.assign(cell, headerStyle); });
    depts.forEach((d) => deptSheet.addRow({ name: d.name }));

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async importFromExcel(fileBuffer: any, adminId?: string): Promise<{ imported: number; skipped: number; errors: string[] }> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);

    const sheet = workbook.getWorksheet('Employés') || workbook.worksheets[0];
    if (!sheet) return { imported: 0, skipped: 0, errors: ['Feuille "Employés" introuvable'] };

    const errors: string[] = [];
    let imported = 0;
    let skipped = 0;

    // Cache departments
    const allDepts = await this.prisma.department.findMany();
    const deptMap = new Map(allDepts.map((d) => [d.name.toLowerCase().trim(), d.id]));

    for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum++) {
      const row = sheet.getRow(rowNum);
      const getValue = (col: number) => {
        const cell = row.getCell(col);
        return cell.text?.toString().trim() || '';
      };

      const matricule = getValue(1);
      const name = getValue(2);
      const grade = getValue(3);
      const gradeLabel = getValue(4);
      const phone = getValue(5);
      const email = getValue(6);
      const deptName = getValue(7);

      // Skip empty rows
      if (!matricule && !name) continue;

      // Validate required fields
      if (!matricule || !name || !grade || !phone || !deptName) {
        errors.push(`Ligne ${rowNum}: champs obligatoires manquants (matricule, nom, grade, téléphone, département)`);
        skipped++;
        continue;
      }

      // Find department
      let deptId = deptMap.get(deptName.toLowerCase().trim());
      if (!deptId) {
        // Auto-create department
        const newDept = await this.prisma.department.create({ data: { name: deptName.trim() } });
        deptId = newDept.id;
        deptMap.set(deptName.toLowerCase().trim(), deptId);
      }

      // Check duplicate
      const existing = await this.prisma.employee.findFirst({
        where: { OR: [{ matricule }, { phone }] },
      });
      if (existing) {
        errors.push(`Ligne ${rowNum}: ${name} (${matricule}) — déjà existant, ignoré`);
        skipped++;
        continue;
      }

      try {
        const hashed = await bcrypt.hash(matricule, 10);
        await this.prisma.employee.create({
          data: {
            matricule,
            name,
            grade,
            gradeLabel: gradeLabel || undefined,
            phone,
            email: email || null,
            password: hashed,
            role: 'EMPLOYEE',
            departmentId: deptId,
          },
        });
        imported++;
        // Send welcome email (non-blocking)
        if (email) {
          const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
        this.emailService.sendWelcome(email, name, matricule, frontendUrl).catch(() => {});
        }
      } catch (e: any) {
        errors.push(`Ligne ${rowNum}: ${name} — ${e.message}`);
        skipped++;
      }
    }

    if (imported > 0) {
      this.audit.log({ action: 'IMPORT_EMPLOYEES', entity: 'Employee', adminId, details: { imported, skipped, errors: errors.length } });
    }
    return { imported, skipped, errors };
  }

  async resetPassword(id: string) {
    const emp = await this.prisma.employee.findUnique({ where: { id } });
    if (!emp) throw new NotFoundException('Employee not found');
    const hashed = await bcrypt.hash(emp.matricule, 10);
    await this.prisma.employee.update({
      where: { id },
      data: { password: hashed },
    });
    return { message: 'Password reset to matricule number' };
  }
}
