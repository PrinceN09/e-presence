-- Add lunch tracking to Attendance
ALTER TABLE "Attendance" ADD COLUMN "lunchOutAt" TIMESTAMP(3);
ALTER TABLE "Attendance" ADD COLUMN "lunchInAt" TIMESTAMP(3);

-- Create enums
CREATE TYPE "LeaveType" AS ENUM ('MATERNITY', 'SICK', 'PERSONAL', 'VACATION', 'MISSION');
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- Create LeaveRequest table
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "LeaveType" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "reason" TEXT,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create PublicHoliday table
CREATE TABLE "PublicHoliday" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "recurring" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PublicHoliday_pkey" PRIMARY KEY ("id")
);

-- Seed DRC public holidays (2025 dates; recurring ones apply every year by month/day)
INSERT INTO "PublicHoliday" ("id", "name", "date", "recurring") VALUES
  (gen_random_uuid(), 'Jour de l''An', '2025-01-01', true),
  (gen_random_uuid(), 'Journée des Martyrs de l''Indépendance', '2025-01-04', true),
  (gen_random_uuid(), 'Journée de la Femme', '2025-03-08', true),
  (gen_random_uuid(), 'Fête du Travail', '2025-05-01', true),
  (gen_random_uuid(), 'Journée des Mères', '2025-05-15', true),
  (gen_random_uuid(), 'Fête de l''Indépendance', '2025-06-30', true),
  (gen_random_uuid(), 'Journée des Parents', '2025-08-01', true),
  (gen_random_uuid(), 'Fête de la Jeunesse', '2025-10-14', true),
  (gen_random_uuid(), 'Journée des Morts', '2025-11-01', true),
  (gen_random_uuid(), 'Fête Nationale de la Démocratie', '2025-12-21', true),
  (gen_random_uuid(), 'Noël', '2025-12-25', true);
