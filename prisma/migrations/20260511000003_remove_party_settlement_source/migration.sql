DROP INDEX IF EXISTS "Voucher_entrySource_createdAt_idx";
ALTER TABLE "Voucher" DROP COLUMN IF EXISTS "entrySource";
