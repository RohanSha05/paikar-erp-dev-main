-- Add mockdb-compatible investor profile fields
ALTER TABLE "Investor"
ADD COLUMN IF NOT EXISTS "nomineeName" TEXT,
ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);
