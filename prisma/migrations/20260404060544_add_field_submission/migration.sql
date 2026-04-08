-- CreateTable
CREATE TABLE "FieldSubmission" (
    "id" TEXT NOT NULL,
    "signerId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FieldSubmission_signerId_fieldId_key" ON "FieldSubmission"("signerId", "fieldId");

-- AddForeignKey
ALTER TABLE "FieldSubmission" ADD CONSTRAINT "FieldSubmission_signerId_fkey" FOREIGN KEY ("signerId") REFERENCES "Signer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldSubmission" ADD CONSTRAINT "FieldSubmission_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "DocumentField"("id") ON DELETE CASCADE ON UPDATE CASCADE;
