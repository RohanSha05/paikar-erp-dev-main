-- CreateEnum
CREATE TYPE "SalesStatus" AS ENUM ('DRAFT', 'CONFIRMED');

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "bankInfo" TEXT,
ADD COLUMN     "opening" DECIMAL(18,4),
ADD COLUMN     "partyKind" TEXT,
ADD COLUMN     "partyRefId" TEXT;

-- AlterTable
ALTER TABLE "Lot" ADD COLUMN     "label" TEXT,
ADD COLUMN     "meta" JSONB;

-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN     "advanceInstrumentId" TEXT,
ADD COLUMN     "advancePaid" DECIMAL(18,4),
ADD COLUMN     "bagCostMode" TEXT,
ADD COLUMN     "destinationCustomerId" TEXT,
ADD COLUMN     "destinationKind" TEXT,
ADD COLUMN     "destinationRefId" TEXT,
ADD COLUMN     "destinationType" TEXT,
ADD COLUMN     "destinationWarehouseId" TEXT,
ADD COLUMN     "driverId" TEXT,
ADD COLUMN     "driverName" TEXT,
ADD COLUMN     "driverTripId" TEXT,
ADD COLUMN     "loadingUnloading" DECIMAL(18,4),
ADD COLUMN     "productType" TEXT,
ADD COLUMN     "purchaseType" TEXT,
ADD COLUMN     "remarks" TEXT,
ADD COLUMN     "route" TEXT,
ADD COLUMN     "transportMode" TEXT,
ADD COLUMN     "truckNo" TEXT,
ADD COLUMN     "varietyNote" TEXT;

-- AlterTable
ALTER TABLE "PurchaseOrderItem" ADD COLUMN     "destinationRefId" TEXT,
ADD COLUMN     "destinationType" TEXT,
ADD COLUMN     "lineId" TEXT,
ADD COLUMN     "loadingUnloading" DECIMAL(18,4),
ADD COLUMN     "misc" DECIMAL(18,4),
ADD COLUMN     "productName" TEXT,
ADD COLUMN     "transportCost" DECIMAL(18,4),
ADD COLUMN     "transportMode" TEXT;

-- AlterTable
ALTER TABLE "Seller" ADD COLUMN     "address" TEXT;

-- AlterTable
ALTER TABLE "StockMove" ADD COLUMN     "lotLabel" TEXT,
ADD COLUMN     "memo" TEXT;

-- AlterTable
ALTER TABLE "Voucher" ADD COLUMN     "locked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "salesOrderId" TEXT;

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
CREATE TABLE "SalesOrder" (
    "id" TEXT NOT NULL,
    "soNo" TEXT NOT NULL,
    "status" "SalesStatus" NOT NULL DEFAULT 'DRAFT',
    "customerId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "transport" DECIMAL(18,4) NOT NULL,
    "loadingUnloading" DECIMAL(18,4) NOT NULL,
    "misc" DECIMAL(18,4) NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOrderItem" (
    "id" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "qtyKg" DECIMAL(18,4) NOT NULL,
    "rateBasis" TEXT NOT NULL,
    "rateValue" DECIMAL(18,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_soNo_key" ON "SalesOrder"("soNo");

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
