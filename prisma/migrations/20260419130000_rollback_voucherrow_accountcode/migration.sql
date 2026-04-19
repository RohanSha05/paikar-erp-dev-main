-- Roll back temporary account-code schema drift on VoucherRow.
-- Some environments received a non-Prisma accountCode column that conflicts
-- with the canonical Prisma model which uses accountId relation to Account.id.
ALTER TABLE "VoucherRow" DROP CONSTRAINT IF EXISTS "VoucherRow_accountCode_fkey";
DROP INDEX IF EXISTS "VoucherRow_accountCode_idx";
ALTER TABLE "VoucherRow" DROP COLUMN IF EXISTS "accountCode";
