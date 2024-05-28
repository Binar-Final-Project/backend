/*
  Warnings:

  - You are about to drop the `boarding_pass` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[user_id]` on the table `orderers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[ticket_id]` on the table `transactions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `user_id` to the `orderers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ticket_id` to the `passengers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ticket_id` to the `transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "boarding_pass" DROP CONSTRAINT "boarding_pass_passenger_id_fkey";

-- DropForeignKey
ALTER TABLE "boarding_pass" DROP CONSTRAINT "boarding_pass_ticket_id_fkey";

-- AlterTable
ALTER TABLE "orderers" ADD COLUMN     "user_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "passengers" ADD COLUMN     "ticket_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "ticket_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "name" DROP NOT NULL,
ALTER COLUMN "is_verified" SET DEFAULT false,
ALTER COLUMN "otp_number" DROP NOT NULL;

-- DropTable
DROP TABLE "boarding_pass";

-- CreateIndex
CREATE UNIQUE INDEX "orderers_user_id_key" ON "orderers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_ticket_id_key" ON "transactions"("ticket_id");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("ticket_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orderers" ADD CONSTRAINT "orderers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passengers" ADD CONSTRAINT "passengers_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("ticket_id") ON DELETE RESTRICT ON UPDATE CASCADE;
