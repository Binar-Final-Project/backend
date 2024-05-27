-- CreateEnum
CREATE TYPE "transaction_status" AS ENUM ('UNPAID', 'CANCELLED', 'ISSUED');

-- CreateTable
CREATE TABLE "users" (
    "user_id" SERIAL NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "otp_number" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "notification_id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("notification_id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "transaction_id" SERIAL NOT NULL,
    "total_price" INTEGER NOT NULL,
    "tax" INTEGER NOT NULL,
    "payment_method" TEXT NOT NULL,
    "booking_code" TEXT NOT NULL,
    "status" "transaction_status" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" INTEGER NOT NULL,
    "ticket_id" INTEGER NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("transaction_id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "ticket_id" SERIAL NOT NULL,
    "total_adult" INTEGER NOT NULL,
    "total_children" INTEGER NOT NULL,
    "total_baby" INTEGER NOT NULL,
    "flight_id" INTEGER NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("ticket_id")
);

-- CreateTable
CREATE TABLE "orderers" (
    "orderer_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "family_name" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "orderers_pkey" PRIMARY KEY ("orderer_id")
);

-- CreateTable
CREATE TABLE "passengers" (
    "passenger_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passenger_type" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "nationality" TEXT NOT NULL,
    "identity_number" TEXT NOT NULL,
    "issuing_country" TEXT NOT NULL,
    "valid_until" DATE NOT NULL,
    "orderer_id" INTEGER NOT NULL,
    "ticket_id" INTEGER NOT NULL,

    CONSTRAINT "passengers_pkey" PRIMARY KEY ("passenger_id")
);

-- CreateTable
CREATE TABLE "flights" (
    "flight_id" SERIAL NOT NULL,
    "flight_number" TEXT NOT NULL,
    "flight_date" DATE NOT NULL,
    "departure_time" TIME NOT NULL,
    "arrival_time" TIME NOT NULL,
    "departure_terminal" TEXT NOT NULL,
    "arrival_terminal" TEXT NOT NULL,
    "class" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "free_baggage" TEXT NOT NULL,
    "cabin_baggage" TEXT NOT NULL,
    "entertainment" BOOLEAN NOT NULL,
    "airplane_id" INTEGER NOT NULL,
    "departure_airport_id" INTEGER NOT NULL,
    "arrival_airport_id" INTEGER NOT NULL,

    CONSTRAINT "flights_pkey" PRIMARY KEY ("flight_id")
);

-- CreateTable
CREATE TABLE "airports" (
    "airport_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "code" TEXT NOT NULL,

    CONSTRAINT "airports_pkey" PRIMARY KEY ("airport_id")
);

-- CreateTable
CREATE TABLE "airlines" (
    "airline_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT NOT NULL,
    "iconUrl" TEXT NOT NULL,

    CONSTRAINT "airlines_pkey" PRIMARY KEY ("airline_id")
);

-- CreateTable
CREATE TABLE "airplanes" (
    "airplane_id" SERIAL NOT NULL,
    "model" TEXT NOT NULL,
    "airline_id" INTEGER NOT NULL,

    CONSTRAINT "airplanes_pkey" PRIMARY KEY ("airplane_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_number_key" ON "users"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_booking_code_key" ON "transactions"("booking_code");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_ticket_id_key" ON "transactions"("ticket_id");

-- CreateIndex
CREATE UNIQUE INDEX "orderers_user_id_key" ON "orderers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "flights_flight_number_key" ON "flights"("flight_number");

-- CreateIndex
CREATE UNIQUE INDEX "airports_code_key" ON "airports"("code");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("ticket_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_flight_id_fkey" FOREIGN KEY ("flight_id") REFERENCES "flights"("flight_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orderers" ADD CONSTRAINT "orderers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passengers" ADD CONSTRAINT "passengers_orderer_id_fkey" FOREIGN KEY ("orderer_id") REFERENCES "orderers"("orderer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passengers" ADD CONSTRAINT "passengers_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("ticket_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flights" ADD CONSTRAINT "flights_airplane_id_fkey" FOREIGN KEY ("airplane_id") REFERENCES "airplanes"("airplane_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flights" ADD CONSTRAINT "flights_departure_airport_id_fkey" FOREIGN KEY ("departure_airport_id") REFERENCES "airports"("airport_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flights" ADD CONSTRAINT "flights_arrival_airport_id_fkey" FOREIGN KEY ("arrival_airport_id") REFERENCES "airports"("airport_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "airplanes" ADD CONSTRAINT "airplanes_airline_id_fkey" FOREIGN KEY ("airline_id") REFERENCES "airlines"("airline_id") ON DELETE RESTRICT ON UPDATE CASCADE;
