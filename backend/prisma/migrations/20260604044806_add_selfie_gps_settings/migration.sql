/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `Employee` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "selfieUrl" TEXT;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "email" TEXT;

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL,
    "officeLatitude" DOUBLE PRECISION,
    "officeLongitude" DOUBLE PRECISION,
    "officeRadius" INTEGER NOT NULL DEFAULT 200,
    "officeName" TEXT NOT NULL DEFAULT 'Bureau Principal',

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");
