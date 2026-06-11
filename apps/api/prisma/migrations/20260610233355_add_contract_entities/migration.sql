-- AlterTable
ALTER TABLE "Investment" ADD COLUMN     "bulletinSignedAt" TIMESTAMP(3),
ADD COLUMN     "contratEmitterSignedAt" TIMESTAMP(3),
ADD COLUMN     "contratInvestorSignedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TenantEntity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "legalForm" TEXT NOT NULL DEFAULT 'SAS',
    "capital" INTEGER NOT NULL DEFAULT 1000,
    "address" TEXT NOT NULL DEFAULT '',
    "rcsCity" TEXT NOT NULL DEFAULT '',
    "rcsNumber" TEXT NOT NULL DEFAULT '',
    "representative" TEXT NOT NULL DEFAULT '',
    "representativeTitle" TEXT NOT NULL DEFAULT 'Directeur Général',
    "email" TEXT,
    "signatureCity" TEXT NOT NULL DEFAULT 'Strasbourg',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractConfig" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "priorityRank" INTEGER NOT NULL DEFAULT 1,
    "minGuaranteedRate" DECIMAL(5,2) NOT NULL DEFAULT 6,
    "guaranteedPeriodMonths" INTEGER NOT NULL DEFAULT 3,
    "monthlyComplementaryRate" DECIMAL(5,2) NOT NULL DEFAULT 2,
    "contractualCapRate" DECIMAL(5,2) NOT NULL DEFAULT 22,
    "propertyDescription" TEXT,
    "massRepresentative" TEXT NOT NULL DEFAULT '',
    "competentCourt" TEXT NOT NULL DEFAULT 'Strasbourg',
    "earlyRepaymentNoticeDays" INTEGER NOT NULL DEFAULT 7,
    "latePaymentPenaltyPoints" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantEntity_tenantId_key" ON "TenantEntity"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ContractConfig_projectId_key" ON "ContractConfig"("projectId");

-- AddForeignKey
ALTER TABLE "ContractConfig" ADD CONSTRAINT "ContractConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
