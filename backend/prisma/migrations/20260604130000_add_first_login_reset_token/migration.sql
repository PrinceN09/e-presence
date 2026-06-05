-- Add firstLogin to Employee
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "firstLogin" BOOLEAN NOT NULL DEFAULT true;

-- Create PasswordResetToken table
CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
  "id"         TEXT NOT NULL,
  "token"      TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "expiresAt"  TIMESTAMP(3) NOT NULL,
  "used"       BOOLEAN NOT NULL DEFAULT false,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PasswordResetToken_token_key" UNIQUE ("token"),
  CONSTRAINT "PasswordResetToken_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
