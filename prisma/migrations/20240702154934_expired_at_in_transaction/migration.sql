/*
  Warnings:

  - Added the required column `expired_at` to the `transactions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "expired_at" TIMESTAMP(3) NOT NULL;
