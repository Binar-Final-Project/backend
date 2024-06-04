-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "card_holder_name" TEXT,
ADD COLUMN     "card_number" TEXT,
ADD COLUMN     "cvv" TEXT,
ADD COLUMN     "expiry_date" TEXT;
