import { PrismaClient, Role } from '@prisma/client';

const DRC_HOLIDAYS = [
  { name: "Jour de l'An",                           month: 1,  day: 1  },
  { name: "Journée des Martyrs de l'Indépendance",  month: 1,  day: 4  },
  { name: "Journée de la Femme",                    month: 3,  day: 8  },
  { name: "Fête du Travail",                         month: 5,  day: 1  },
  { name: "Journée des Mères",                       month: 5,  day: 15 },
  { name: "Fête de l'Indépendance",                 month: 6,  day: 30 },
  { name: "Journée des Parents",                     month: 8,  day: 1  },
  { name: "Fête de la Jeunesse",                     month: 10, day: 14 },
  { name: "Journée des Morts",                       month: 11, day: 1  },
  { name: "Fête Nationale de la Démocratie",         month: 12, day: 21 },
  { name: "Noël",                                    month: 12, day: 25 },
];
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Create departments
  const divisions = [
    'Division Unique',
    'Division Administrative',
    'Division Financière',
    'Division Technique',
    'Direction Générale',
  ];

  for (const name of divisions) {
    await prisma.department.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const dept = await prisma.department.findFirst({
    where: { name: 'Division Unique' },
  });

  // Create admin
  const adminPassword = await bcrypt.hash('Admin@1234', 10);
  await prisma.employee.upsert({
    where: { matricule: '0.000.001' },
    update: {},
    create: {
      matricule: '0.000.001',
      name: 'Administrateur Système',
      grade: 'ADM',
      gradeLabel: 'Administrateur',
      phone: '+243000000000',
      password: adminPassword,
      role: Role.ADMIN,
      departmentId: dept!.id,
    },
  });

  // Seed DRC public holidays
  const existingHolidays = await prisma.publicHoliday.count();
  if (existingHolidays === 0) {
    for (const h of DRC_HOLIDAYS) {
      const date = new Date(new Date().getFullYear(), h.month - 1, h.day);
      await prisma.publicHoliday.create({
        data: { name: h.name, date, recurring: true },
      });
    }
    console.log(`✅ ${DRC_HOLIDAYS.length} jours fériés DRC insérés`);
  } else {
    console.log(`ℹ️ Jours fériés déjà présents (${existingHolidays})`);
  }

  console.log('✅ Seed completed');
  console.log('Admin matricule: 0.000.001');
  console.log('Admin password: Admin@1234');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
