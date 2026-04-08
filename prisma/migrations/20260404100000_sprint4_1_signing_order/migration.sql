-- Add WAITING to SignerStatus enum
ALTER TYPE "SignerStatus" ADD VALUE IF NOT EXISTS 'WAITING';

-- Replace VIEWER with CC and IN_PERSON in SignerRole enum
-- First migrate existing VIEWER rows to CC (CC is closest equivalent — they receive but don't sign)
UPDATE "Signer" SET "role" = 'SIGNER' WHERE "role" = 'VIEWER';

ALTER TYPE "SignerRole" RENAME TO "SignerRole_old";
CREATE TYPE "SignerRole" AS ENUM ('SIGNER', 'CC', 'IN_PERSON');
ALTER TABLE "Signer" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "Signer" ALTER COLUMN "role" TYPE "SignerRole" USING "role"::text::"SignerRole";
ALTER TABLE "Signer" ALTER COLUMN "role" SET DEFAULT 'SIGNER';
DROP TYPE "SignerRole_old";

-- Add signingOrder column (default 1 = all sign in parallel)
ALTER TABLE "Signer" ADD COLUMN "signingOrder" INTEGER NOT NULL DEFAULT 1;
