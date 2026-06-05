-- Add tokenVersion to Employee (for forced session invalidation)
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- Create AuditLog table
CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id"        TEXT NOT NULL,
  "action"    TEXT NOT NULL,
  "entity"    TEXT NOT NULL,
  "entityId"  TEXT,
  "details"   JSONB,
  "adminId"   TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuditLog_adminId_fkey"
    FOREIGN KEY ("adminId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Index for fast filtering
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "AuditLog_action_idx"    ON "AuditLog"("action");
CREATE INDEX IF NOT EXISTS "AuditLog_adminId_idx"   ON "AuditLog"("adminId");
