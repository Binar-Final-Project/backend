-- CreateIndex
CREATE INDEX "idx_cheapest_flight_search" ON "flights"("flight_date", "departure_airport_id", "arrival_airport_id", "class", "price");
