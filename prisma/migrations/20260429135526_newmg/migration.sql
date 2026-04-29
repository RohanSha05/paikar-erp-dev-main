-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'OPERATOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('DRAFT', 'APPROVED');

-- CreateEnum
CREATE TYPE "RateBasis" AS ENUM ('perKg', 'perMon', 'perBag');

-- CreateEnum
CREATE TYPE "SalesStatus" AS ENUM ('DRAFT', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "SalesOrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StockMoveReason" AS ENUM ('PURCHASE', 'SALE', 'TRANSFER', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "StockRefType" AS ENUM ('PO', 'SO', 'TRF', 'ADJ');

-- CreateEnum
CREATE TYPE "PartyType" AS ENUM ('CUSTOMER', 'SELLER', 'MILL', 'DRIVER', 'INVESTOR', 'EMPLOYEE', 'OTHER');

-- CreateTable
CREATE TABLE "RetailPurchaseDraft" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "sellerId" TEXT,
    "market" TEXT,
    "mon" DECIMAL(18,4) NOT NULL,
    "price" DECIMAL(18,4) NOT NULL,
    "bagCount" INTEGER,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "paidAmount" DECIMAL(18,4) NOT NULL,
    "dueAmount" DECIMAL(18,4) NOT NULL,
    "isDue" BOOLEAN NOT NULL DEFAULT false,
    "sellerName" TEXT,
    "sellerAddress" TEXT,
    "sellerPhone" TEXT,
    "bagCostPerBag" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "productId" TEXT,
    "productName" TEXT,
    "productCategory" TEXT,
    "poId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetailPurchaseDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OPERATOR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Seller" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "district" TEXT,
    "market" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Seller_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "truckNo" TEXT,
    "licenseNo" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverTrip" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "driverName" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "route" TEXT,
    "truckNo" TEXT,
    "amount" DECIMAL(18,4) NOT NULL,
    "memo" TEXT,
    "settled" BOOLEAN NOT NULL DEFAULT false,
    "settledAt" TIMESTAMP(3),
    "poId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverTrip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "district" TEXT,
    "market" TEXT,
    "phone" TEXT,
    "type" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'bag',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

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
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "poNo" TEXT NOT NULL,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'DRAFT',
    "purchaseType" TEXT,
    "sellerId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "transport" DECIMAL(18,4) NOT NULL,
    "loading" DECIMAL(18,4) NOT NULL,
    "misc" DECIMAL(18,4) NOT NULL,
    "loadingUnloading" DECIMAL(18,4),
    "bagCostMode" TEXT,
    "bagCostPerBag" DECIMAL(18,4) NOT NULL,
    "remarks" TEXT,
    "productType" TEXT,
    "varietyNote" TEXT,
    "destinationType" TEXT,
    "destinationRefId" TEXT,
    "destinationKind" TEXT,
    "destinationWarehouseId" TEXT,
    "destinationCustomerId" TEXT,
    "advancePaid" DECIMAL(18,4),
    "advanceInstrumentId" TEXT,
    "transportMode" TEXT,
    "driverId" TEXT,
    "driverName" TEXT,
    "truckNo" TEXT,
    "route" TEXT,
    "driverTripId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "lineId" TEXT,
    "productId" TEXT NOT NULL,
    "productName" TEXT,
    "bagCount" INTEGER NOT NULL,
    "actualKgPerBag" DECIMAL(18,4) NOT NULL,
    "accountingKgPerBag" DECIMAL(18,4) NOT NULL,
    "weightPolicy" TEXT NOT NULL,
    "rateBasis" TEXT NOT NULL,
    "rateValue" DECIMAL(18,4) NOT NULL,
    "transportMode" TEXT,
    "transportCost" DECIMAL(18,4),
    "loadingUnloading" DECIMAL(18,4),
    "misc" DECIMAL(18,4),
    "destinationType" TEXT,
    "destinationRefId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lot" (
    "id" TEXT NOT NULL,
    "lotNo" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "availableKg" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "avgCostPerKg" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "meta" JSONB,
    "sourcePoId" TEXT,
    "sourcePoItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMove" (
    "id" TEXT NOT NULL,
    "moveNo" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "qtyKg" DECIMAL(18,4) NOT NULL,
    "reason" "StockMoveReason" NOT NULL,
    "refType" "StockRefType" NOT NULL,
    "refId" TEXT NOT NULL,
    "memo" TEXT,
    "createdBy" TEXT,
    "lotLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMove_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOrder" (
    "id" TEXT NOT NULL,
    "soNo" TEXT NOT NULL,
    "status" "SalesOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "customerId" TEXT NOT NULL,
    "customerSnapshot" JSONB NOT NULL,
    "transport" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "loadingUnloading" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "misc" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "totalsJson" JSONB,
    "confirmedAt" TIMESTAMP(3),
    "confirmedBy" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOrderItem" (
    "id" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "productId" TEXT,
    "productType" TEXT NOT NULL,
    "qtyKg" DECIMAL(14,3) NOT NULL,
    "rateBasis" "RateBasis" NOT NULL,
    "rateValue" DECIMAL(14,3) NOT NULL,
    "ratePerKg" DECIMAL(14,4) NOT NULL,
    "lineBase" DECIMAL(14,2) NOT NULL,
    "bagCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "partyKind" TEXT,
    "partyRefId" TEXT,
    "bankInfo" TEXT,
    "opening" DECIMAL(18,4),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Investor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "nidNo" TEXT,
    "nomineeName" TEXT,
    "startDate" TIMESTAMP(3),
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
CREATE TABLE "Voucher" (
    "id" TEXT NOT NULL,
    "voucherNo" TEXT NOT NULL,
    "vtype" TEXT NOT NULL,
    "vdate" TIMESTAMP(3) NOT NULL,
    "narration" TEXT,
    "purchaseOrderId" TEXT,
    "salesOrderId" TEXT,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Voucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoucherRow" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "dr" DECIMAL(18,4) NOT NULL,
    "cr" DECIMAL(18,4) NOT NULL,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoucherRow_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "RetailPurchaseDraft_status_date_idx" ON "RetailPurchaseDraft"("status", "date");

-- CreateIndex
CREATE INDEX "RetailPurchaseDraft_sellerId_idx" ON "RetailPurchaseDraft"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Driver_active_idx" ON "Driver"("active");

-- CreateIndex
CREATE INDEX "DriverTrip_driverId_date_idx" ON "DriverTrip"("driverId", "date");

-- CreateIndex
CREATE INDEX "DriverTrip_createdAt_idx" ON "DriverTrip"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");

-- CreateIndex
CREATE INDEX "Product_active_idx" ON "Product"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Party_code_key" ON "Party"("code");

-- CreateIndex
CREATE INDEX "Party_type_idx" ON "Party"("type");

-- CreateIndex
CREATE INDEX "Party_active_idx" ON "Party"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_code_key" ON "Warehouse"("code");

-- CreateIndex
CREATE INDEX "Warehouse_active_idx" ON "Warehouse"("active");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_poNo_key" ON "PurchaseOrder"("poNo");

-- CreateIndex
CREATE INDEX "PurchaseOrder_status_createdAt_idx" ON "PurchaseOrder"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Lot_lotNo_key" ON "Lot"("lotNo");

-- CreateIndex
CREATE UNIQUE INDEX "Lot_label_key" ON "Lot"("label");

-- CreateIndex
CREATE INDEX "Lot_warehouseId_productId_idx" ON "Lot"("warehouseId", "productId");

-- CreateIndex
CREATE INDEX "Lot_availableKg_idx" ON "Lot"("availableKg");

-- CreateIndex
CREATE INDEX "Lot_createdAt_idx" ON "Lot"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StockMove_moveNo_key" ON "StockMove"("moveNo");

-- CreateIndex
CREATE INDEX "StockMove_refType_refId_idx" ON "StockMove"("refType", "refId");

-- CreateIndex
CREATE INDEX "StockMove_lotId_createdAt_idx" ON "StockMove"("lotId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMove_warehouseId_createdAt_idx" ON "StockMove"("warehouseId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_soNo_key" ON "SalesOrder"("soNo");

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
CREATE UNIQUE INDEX "Account_code_key" ON "Account"("code");

-- CreateIndex
CREATE INDEX "InvestorTxn_investorId_date_idx" ON "InvestorTxn"("investorId", "date");

-- CreateIndex
CREATE INDEX "InvestorTxn_createdAt_idx" ON "InvestorTxn"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Voucher_voucherNo_key" ON "Voucher"("voucherNo");

-- CreateIndex
CREATE INDEX "Voucher_vdate_idx" ON "Voucher"("vdate");

-- CreateIndex
CREATE INDEX "VoucherRow_accountId_idx" ON "VoucherRow"("accountId");

-- CreateIndex
CREATE INDEX "RecurringExpenseTemplate_active_idx" ON "RecurringExpenseTemplate"("active");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringExpensePost_templateId_year_month_key" ON "RecurringExpensePost"("templateId", "year", "month");

-- AddForeignKey
ALTER TABLE "RetailPurchaseDraft" ADD CONSTRAINT "RetailPurchaseDraft_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverTrip" ADD CONSTRAINT "DriverTrip_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_sourcePoId_fkey" FOREIGN KEY ("sourcePoId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMove" ADD CONSTRAINT "StockMove_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMove" ADD CONSTRAINT "StockMove_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestorTxn" ADD CONSTRAINT "InvestorTxn_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherRow" ADD CONSTRAINT "VoucherRow_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherRow" ADD CONSTRAINT "VoucherRow_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringExpensePost" ADD CONSTRAINT "RecurringExpensePost_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "RecurringExpenseTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
