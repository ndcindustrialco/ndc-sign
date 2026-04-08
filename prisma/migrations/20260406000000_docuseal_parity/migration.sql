-- ============================================================
-- Docuseal parity migration
-- ============================================================

-- 1. DocumentStatus enum: rename READY→DRAFT, SIGNED→COMPLETED, add VOIDED
ALTER TYPE "DocumentStatus" RENAME VALUE 'READY' TO 'DRAFT';
ALTER TYPE "DocumentStatus" RENAME VALUE 'SIGNED' TO 'COMPLETED';
ALTER TYPE "DocumentStatus" ADD VALUE IF NOT EXISTS 'VOIDED';

-- 2. Document: add voidedAt, voidReason columns
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "voidedAt"   TIMESTAMP(3);
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "voidReason" TEXT;

-- 3. Signer: add declineReason, isStub; drop old email uniqueness
ALTER TABLE "Signer" ADD COLUMN IF NOT EXISTS "declineReason" TEXT;
ALTER TABLE "Signer" ADD COLUMN IF NOT EXISTS "isStub"        BOOLEAN NOT NULL DEFAULT false;

-- Drop the (documentId, email) unique constraint — stub signers share blank email
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Signer_documentId_email_key'
  ) THEN
    ALTER TABLE "Signer" DROP CONSTRAINT "Signer_documentId_email_key";
  END IF;
END $$;

-- 4. AuditEventType enum
DO $$ BEGIN
  CREATE TYPE "AuditEventType" AS ENUM (
    'DOCUMENT_CREATED',
    'DOCUMENT_SENT',
    'DOCUMENT_COMPLETED',
    'DOCUMENT_VOIDED',
    'SIGNER_INVITED',
    'SIGNER_OPENED',
    'SIGNER_SIGNED',
    'SIGNER_DECLINED',
    'SIGNER_REINVITED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5. AuditEvent table
CREATE TABLE IF NOT EXISTS "AuditEvent" (
  "id"         TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "type"       "AuditEventType" NOT NULL,
  "actorEmail" TEXT,
  "actorName"  TEXT,
  "meta"       JSONB,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuditEvent_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "AuditEvent_documentId_idx" ON "AuditEvent"("documentId");
