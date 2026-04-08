-- CreateEnum
CREATE TYPE "SignerRole" AS ENUM ('SIGNER', 'APPROVER', 'VIEWER');

-- CreateEnum
CREATE TYPE "SignerStatus" AS ENUM ('PENDING', 'OPENED', 'SIGNED', 'DECLINED');

-- CreateTable
CREATE TABLE "Signer" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "SignerRole" NOT NULL DEFAULT 'SIGNER',
    "order" INTEGER NOT NULL,
    "status" "SignerStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Signer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignerToken" (
    "id" TEXT NOT NULL,
    "signerId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignerToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Signer_documentId_email_key" ON "Signer"("documentId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Signer_documentId_order_key" ON "Signer"("documentId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "SignerToken_signerId_key" ON "SignerToken"("signerId");

-- CreateIndex
CREATE UNIQUE INDEX "SignerToken_tokenHash_key" ON "SignerToken"("tokenHash");

-- AddForeignKey
ALTER TABLE "Signer" ADD CONSTRAINT "Signer_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignerToken" ADD CONSTRAINT "SignerToken_signerId_fkey" FOREIGN KEY ("signerId") REFERENCES "Signer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
