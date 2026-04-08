-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "documentHash" TEXT,
ADD COLUMN     "signedAt" TIMESTAMP(3),
ADD COLUMN     "signedStoragePath" TEXT;
