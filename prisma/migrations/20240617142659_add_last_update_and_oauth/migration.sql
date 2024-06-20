-- AlterTable
ALTER TABLE "users" ADD COLUMN     "google_id" TEXT,
ALTER COLUMN "phone_number" DROP NOT NULL,
ALTER COLUMN "password" DROP NOT NULL;

-- CreateTable
CREATE TABLE "LastUpdate" (
    "id" SERIAL NOT NULL,
    "last_update" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LastUpdate_pkey" PRIMARY KEY ("id")
);
