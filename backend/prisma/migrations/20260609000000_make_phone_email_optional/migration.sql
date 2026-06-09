-- Make phone optional (was required)
ALTER TABLE "Employee" ALTER COLUMN "phone" DROP NOT NULL;
