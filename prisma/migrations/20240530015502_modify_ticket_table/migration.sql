/*
  Warnings:

  - You are about to drop the column `flight_id` on the `tickets` table. All the data in the column will be lost.
  - Added the required column `departure_flight_id` to the `tickets` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_flight_id_fkey";

-- AlterTable
ALTER TABLE "tickets" DROP COLUMN "flight_id",
ADD COLUMN     "arrival_flight_id" INTEGER,
ADD COLUMN     "departure_flight_id" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_departure_flight_id_fkey" FOREIGN KEY ("departure_flight_id") REFERENCES "flights"("flight_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_arrival_flight_id_fkey" FOREIGN KEY ("arrival_flight_id") REFERENCES "flights"("flight_id") ON DELETE SET NULL ON UPDATE CASCADE;
