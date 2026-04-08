-- Update any existing APPROVER rows to SIGNER before dropping the enum value
UPDATE "Signer" SET "role" = 'SIGNER' WHERE "role" = 'APPROVER';

-- Remove APPROVER from SignerRole enum
ALTER TYPE "SignerRole" RENAME TO "SignerRole_old";
CREATE TYPE "SignerRole" AS ENUM ('SIGNER', 'VIEWER');
ALTER TABLE "Signer" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "Signer" ALTER COLUMN "role" TYPE "SignerRole" USING "role"::text::"SignerRole";
ALTER TABLE "Signer" ALTER COLUMN "role" SET DEFAULT 'SIGNER';
DROP TYPE "SignerRole_old";
