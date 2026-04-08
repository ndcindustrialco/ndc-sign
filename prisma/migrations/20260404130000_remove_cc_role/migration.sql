UPDATE "Signer" SET "role" = 'SIGNER' WHERE "role" = 'CC';
ALTER TYPE "SignerRole" RENAME TO "SignerRole_old";
CREATE TYPE "SignerRole" AS ENUM ('SIGNER');
ALTER TABLE "Signer" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "Signer" ALTER COLUMN "role" TYPE "SignerRole" USING "role"::text::"SignerRole";
ALTER TABLE "Signer" ALTER COLUMN "role" SET DEFAULT 'SIGNER';
DROP TYPE "SignerRole_old";
