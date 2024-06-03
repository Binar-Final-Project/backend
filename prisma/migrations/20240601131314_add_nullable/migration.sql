-- AlterTable
ALTER TABLE "orderers" ALTER COLUMN "family_name" DROP NOT NULL;

-- AlterTable
ALTER TABLE "transactions" ALTER COLUMN "payment_method" DROP NOT NULL;
