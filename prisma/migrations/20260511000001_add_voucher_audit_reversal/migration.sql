-- CreateEnum VoucherStatus
CREATE TYPE "VoucherStatus" AS ENUM ('DRAFT', 'POSTED', 'RECONCILED');

-- CreateEnum AuditActionType
CREATE TYPE "AuditActionType" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'REVERSE');

-- AlterTable Voucher
ALTER TABLE "Voucher" ADD COLUMN "status" "VoucherStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN "userId" TEXT,
ADD COLUMN "postedAt" TIMESTAMP(3),
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable AuditLog
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "action" "AuditActionType" NOT NULL,
    "userId" TEXT,
    "userName" TEXT,
    "changes" JSONB,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable VoucherReversal
CREATE TABLE "VoucherReversal" (
    "id" TEXT NOT NULL,
    "originalVoucherId" TEXT NOT NULL,
    "reversingVoucherId" TEXT NOT NULL,
    "reason" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoucherReversal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex on Voucher
CREATE INDEX "Voucher_vdate_status_idx" ON "Voucher"("vdate", "status");
CREATE INDEX "Voucher_status_createdAt_idx" ON "Voucher"("status", "createdAt");
CREATE INDEX "Voucher_deletedAt_idx" ON "Voucher"("deletedAt");

-- CreateIndex on AuditLog
CREATE INDEX "AuditLog_voucherId_createdAt_idx" ON "AuditLog"("voucherId", "createdAt");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex on VoucherReversal
CREATE INDEX "VoucherReversal_originalVoucherId_idx" ON "VoucherReversal"("originalVoucherId");
CREATE INDEX "VoucherReversal_reversingVoucherId_idx" ON "VoucherReversal"("reversingVoucherId");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherReversal" ADD CONSTRAINT "VoucherReversal_originalVoucherId_fkey" FOREIGN KEY ("originalVoucherId") REFERENCES "Voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherReversal" ADD CONSTRAINT "VoucherReversal_reversingVoucherId_fkey" FOREIGN KEY ("reversingVoucherId") REFERENCES "Voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateUnique constraint on VoucherReversal
CREATE UNIQUE INDEX "VoucherReversal_originalVoucherId_key" ON "VoucherReversal"("originalVoucherId");
CREATE UNIQUE INDEX "VoucherReversal_reversingVoucherId_key" ON "VoucherReversal"("reversingVoucherId");
