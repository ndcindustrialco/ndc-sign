-- Migrate any IN_PERSON rows to SIGNER before dropping the value
UPDATE "Signer" SET "role" = 'SIGNER' WHERE "role" = 'IN_PERSON';

ALTER TYPE "SignerRole" RENAME TO "SignerRole_old";
CREATE TYPE "SignerRole" AS ENUM ('SIGNER', 'CC');
ALTER TABLE "Signer" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "Signer" ALTER COLUMN "role" TYPE "SignerRole" USING "role"::text::"SignerRole";
ALTER TABLE "Signer" ALTER COLUMN "role" SET DEFAULT 'SIGNER';
DROP TYPE "SignerRole_old";
