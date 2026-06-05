import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString } from 'class-validator';

export class CreateDepartmentDto {
  @IsString() name: string;
}

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.department.findMany({
      include: { _count: { select: { employees: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateDepartmentDto) {
    const existing = await this.prisma.department.findUnique({
      where: { name: dto.name },
    });
    if (existing) throw new ConflictException('Department already exists');
    return this.prisma.department.create({ data: dto });
  }

  async update(id: string, dto: CreateDepartmentDto) {
    const dept = await this.prisma.department.findUnique({ where: { id } });
    if (!dept) throw new NotFoundException('Department not found');
    return this.prisma.department.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const dept = await this.prisma.department.findUnique({
      where: { id },
      include: { _count: { select: { employees: true } } },
    });
    if (!dept) throw new NotFoundException('Department not found');
    if (dept._count.employees > 0)
      throw new ConflictException('Cannot delete department with employees');
    await this.prisma.department.delete({ where: { id } });
    return { message: 'Department removed' };
  }
}
