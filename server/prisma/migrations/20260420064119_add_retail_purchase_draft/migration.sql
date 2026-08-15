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
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetailPurchaseDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RetailPurchaseDraft_status_date_idx" ON "RetailPurchaseDraft"("status", "date");

-- CreateIndex
CREATE INDEX "RetailPurchaseDraft_sellerId_idx" ON "RetailPurchaseDraft"("sellerId");

-- AddForeignKey
ALTER TABLE "RetailPurchaseDraft" ADD CONSTRAINT "RetailPurchaseDraft_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE SET NULL ON UPDATE CASCADE;
