/*
  Warnings:

  - You are about to drop the column `google_id` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "google_id",
ADD COLUMN     "is_google" BOOLEAN DEFAULT false;
