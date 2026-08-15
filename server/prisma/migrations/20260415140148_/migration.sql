/*
  Warnings:

  - You are about to drop the column `warehouseId` on the `SalesOrder` table. All the data in the column will be lost.
  - The `status` column on the `SalesOrder` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `transport` on the `SalesOrder` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,4)` to `Decimal(14,2)`.
  - You are about to alter the column `loadingUnloading` on the `SalesOrder` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,4)` to `Decimal(14,2)`.
  - You are about to alter the column `misc` on the `SalesOrder` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,4)` to `Decimal(14,2)`.
  - You are about to alter the column `qtyKg` on the `SalesOrderItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,4)` to `Decimal(14,3)`.
  - You are about to alter the column `rateValue` on the `SalesOrderItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,4)` to `Decimal(14,3)`.
  - A unique constraint covering the columns `[label]` on the table `Lot` will be added. If there are existing duplicate values, this will fail.
  - Made the column `label` on table `Lot` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `customerSnapshot` to the `SalesOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lineBase` to the `SalesOrderItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ratePerKg` to the `SalesOrderItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `SalesOrderItem` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `rateBasis` on the `SalesOrderItem` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `reason` on the `StockMove` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `refType` to the `StockMove` table without a default value. This is not possible if the table is not empty.
  - Made the column `refId` on table `StockMove` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "RateBasis" AS ENUM ('perKg', 'perMon');

-- CreateEnum
CREATE TYPE "SalesOrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StockMoveReason" AS ENUM ('PURCHASE', 'SALE', 'TRANSFER', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "StockRefType" AS ENUM ('PO', 'SO', 'TRF', 'ADJ');

-- CreateEnum
CREATE TYPE "PartyType" AS ENUM ('CUSTOMER', 'SELLER', 'MILL', 'DRIVER', 'INVESTOR', 'EMPLOYEE', 'OTHER');

-- DropForeignKey
ALTER TABLE "SalesOrder" DROP CONSTRAINT "SalesOrder_warehouseId_fkey";

-- AlterTable
ALTER TABLE "Lot" ADD COLUMN     "sourcePoItemId" TEXT,
ALTER COLUMN "availableKg" SET DEFAULT 0,
ALTER COLUMN "avgCostPerKg" SET DEFAULT 0,
ALTER COLUMN "label" SET NOT NULL;

-- AlterTable
ALTER TABLE "SalesOrder" DROP COLUMN "warehouseId",
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedBy" TEXT,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "customerSnapshot" JSONB NOT NULL,
ADD COLUMN     "totalsJson" JSONB,
DROP COLUMN "status",
ADD COLUMN     "status" "SalesOrderStatus" NOT NULL DEFAULT 'DRAFT',
ALTER COLUMN "transport" SET DEFAULT 0,
ALTER COLUMN "transport" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "loadingUnloading" SET DEFAULT 0,
ALTER COLUMN "loadingUnloading" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "misc" SET DEFAULT 0,
ALTER COLUMN "misc" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "SalesOrderItem" ADD COLUMN     "lineBase" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "productId" TEXT,
ADD COLUMN     "ratePerKg" DECIMAL(14,4) NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "qtyKg" SET DATA TYPE DECIMAL(14,3),
DROP COLUMN "rateBasis",
ADD COLUMN     "rateBasis" "RateBasis" NOT NULL,
ALTER COLUMN "rateValue" SET DATA TYPE DECIMAL(14,3);

-- AlterTable
ALTER TABLE "StockMove" ADD COLUMN     "createdBy" TEXT,
DROP COLUMN "reason",
ADD COLUMN     "reason" "StockMoveReason" NOT NULL,
DROP COLUMN "refType",
ADD COLUMN     "refType" "StockRefType" NOT NULL,
ALTER COLUMN "refId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Warehouse" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Party" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PartyType" NOT NULL,
    "district" TEXT,
    "market" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Investor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "nidNo" TEXT,
    "photoUrl" TEXT,
    "agreementPct" DOUBLE PRECISION,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Investor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestorTxn" (
    "id" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "instrument" TEXT,
    "memo" TEXT,
    "voucherId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestorTxn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringExpenseTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "expenseAccountId" TEXT NOT NULL,
    "payFromAccountId" TEXT,
    "amount" DECIMAL(18,4) NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'monthly',
    "dayOfMonth" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "lastPostedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringExpenseTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringExpensePost" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "voucherId" TEXT NOT NULL,
    "voucherNo" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurringExpensePost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Party_code_key" ON "Party"("code");

-- CreateIndex
CREATE INDEX "Party_type_idx" ON "Party"("type");

-- CreateIndex
CREATE INDEX "Party_active_idx" ON "Party"("active");

-- CreateIndex
CREATE INDEX "InvestorTxn_investorId_date_idx" ON "InvestorTxn"("investorId", "date");

-- CreateIndex
CREATE INDEX "InvestorTxn_createdAt_idx" ON "InvestorTxn"("createdAt");

-- CreateIndex
CREATE INDEX "RecurringExpenseTemplate_active_idx" ON "RecurringExpenseTemplate"("active");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringExpensePost_templateId_year_month_key" ON "RecurringExpensePost"("templateId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "Lot_label_key" ON "Lot"("label");

-- CreateIndex
CREATE INDEX "Lot_availableKg_idx" ON "Lot"("availableKg");

-- CreateIndex
CREATE INDEX "Lot_createdAt_idx" ON "Lot"("createdAt");

-- CreateIndex
CREATE INDEX "Product_active_idx" ON "Product"("active");

-- CreateIndex
CREATE INDEX "SalesOrder_status_idx" ON "SalesOrder"("status");

-- CreateIndex
CREATE INDEX "SalesOrder_customerId_idx" ON "SalesOrder"("customerId");

-- CreateIndex
CREATE INDEX "SalesOrder_createdAt_idx" ON "SalesOrder"("createdAt");

-- CreateIndex
CREATE INDEX "SalesOrderItem_salesOrderId_idx" ON "SalesOrderItem"("salesOrderId");

-- CreateIndex
CREATE INDEX "SalesOrderItem_lotId_idx" ON "SalesOrderItem"("lotId");

-- CreateIndex
CREATE INDEX "SalesOrderItem_productId_idx" ON "SalesOrderItem"("productId");

-- CreateIndex
CREATE INDEX "StockMove_refType_refId_idx" ON "StockMove"("refType", "refId");

-- CreateIndex
CREATE INDEX "Warehouse_active_idx" ON "Warehouse"("active");

-- AddForeignKey
ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestorTxn" ADD CONSTRAINT "InvestorTxn_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringExpensePost" ADD CONSTRAINT "RecurringExpensePost_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "RecurringExpenseTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
