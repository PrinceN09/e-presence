import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { startOfDay } from 'date-fns';

@Injectable()
export class PublicHolidaysService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.publicHoliday.findMany({ orderBy: { date: 'asc' } });
  }

  async create(dto: { name: string; date: string; recurring?: boolean }) {
    return this.prisma.publicHoliday.create({
      data: {
        name:      dto.name,
        date:      startOfDay(new Date(dto.date)),
        recurring: dto.recurring ?? true,
      },
    });
  }

  async update(id: string, dto: { name?: string; date?: string; recurring?: boolean }) {
    return this.prisma.publicHoliday.update({
      where: { id },
      data: {
        ...(dto.name      ? { name: dto.name }                           : {}),
        ...(dto.date      ? { date: startOfDay(new Date(dto.date)) }     : {}),
        ...(dto.recurring !== undefined ? { recurring: dto.recurring }   : {}),
      },
    });
  }

  async remove(id: string) {
    await this.prisma.publicHoliday.delete({ where: { id } });
    return { message: 'Jour férié supprimé' };
  }

  /** Returns the public holiday for a given date (checks recurring by month+day too) */
  async getHolidayForDate(date: Date): Promise<{ name: string } | null> {
    const all = await this.prisma.publicHoliday.findMany();
    const d = startOfDay(date);
    for (const h of all) {
      const hd = new Date(h.date);
      if (h.recurring) {
        if (hd.getMonth() === d.getMonth() && hd.getDate() === d.getDate()) return h;
      } else {
        if (hd.toDateString() === d.toDateString()) return h;
      }
    }
    return null;
  }

  /** Returns a set of holiday date strings (YYYY-MM-DD) for a year */
  async getHolidayDatesForYear(year: number): Promise<Map<string, string>> {
    const all = await this.prisma.publicHoliday.findMany();
    const map = new Map<string, string>();
    for (const h of all) {
      const hd = new Date(h.date);
      if (h.recurring) {
        const key = `${year}-${String(hd.getMonth() + 1).padStart(2, '0')}-${String(hd.getDate()).padStart(2, '0')}`;
        map.set(key, h.name);
      } else {
        const key = hd.toISOString().split('T')[0];
        map.set(key, h.name);
      }
    }
    return map;
  }
}
