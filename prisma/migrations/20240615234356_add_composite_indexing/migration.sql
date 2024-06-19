-- CreateIndex
CREATE INDEX "idx_flight_search" ON "flights"("departure_airport_id", "arrival_airport_id", "flight_date", "class");
