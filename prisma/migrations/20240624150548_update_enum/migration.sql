/*
  Warnings:

  - The values [UNPAID,CANCELLED,ISSUED] on the enum `transaction_status` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "transaction_status_new" AS ENUM ('BELUM DIBAYAR', 'BATAL', 'BERHASIL');
ALTER TABLE "transactions" ALTER COLUMN "status" TYPE "transaction_status_new" USING ("status"::text::"transaction_status_new");
ALTER TYPE "transaction_status" RENAME TO "transaction_status_old";
ALTER TYPE "transaction_status_new" RENAME TO "transaction_status";
DROP TYPE "transaction_status_old";
COMMIT;
