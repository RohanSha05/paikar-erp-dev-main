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

-- CreateIndex
CREATE INDEX "DriverTrip_driverId_date_idx" ON "DriverTrip"("driverId", "date");

-- CreateIndex
CREATE INDEX "DriverTrip_createdAt_idx" ON "DriverTrip"("createdAt");

-- AddForeignKey
ALTER TABLE "DriverTrip" ADD CONSTRAINT "DriverTrip_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;