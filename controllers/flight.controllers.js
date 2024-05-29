const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = {
  search: async (req, res, next) => {
    try {
      const { departure_code, arrival_code, departure_date, total_passenger } = req.body;
      const return_date = req.body.return_date || null;
      const seat_class = req.body.seat_class.toUpperCase();

      let sortBy = req.query.sortBy || "PRICE";
      sortBy = Prisma.sql([sortBy.toUpperCase()]);
      let sortOrder = req.query.sortOrder || "ASC";
      sortOrder = Prisma.sql([sortOrder.toUpperCase()]);

      const result = await prisma.$queryRaw`
        WITH purchased_ticket AS (
          SELECT t.flight_id, COUNT(t.flight_id) as count
          FROM tickets t
          INNER JOIN transactions tr ON tr.ticket_id = t.ticket_id
          WHERE tr.status = 'ISSUED'
          GROUP BY t.flight_id
        )
        SELECT
          f.*,
          d_airport.code as dept_code,
          a_airport.code as arr_code,
          airplane.*,
          airline.*
        FROM
          flights f
          INNER JOIN airports d_airport ON d_airport.airport_id = f.departure_airport_id
          INNER JOIN airports a_airport ON a_airport.airport_id = f.arrival_airport_id
          INNER JOIN airplanes airplane ON airplane.airplane_id = f.airplane_id
          INNER JOIN airlines airline ON airline.airline_id = airplane.airline_id
          LEFT JOIN purchased_ticket pt ON pt.flight_id = f.flight_id
        WHERE
          f.flight_date::text LIKE '%' || ${departure_date} || '%'
          AND d_airport.code = ${departure_code}
          AND a_airport.code = ${arrival_code}
          AND f.class = ${seat_class}
          AND f.capacity - COALESCE(pt.count, 0) >= ${total_passenger}
        ORDER BY ${sortBy} ${sortOrder};
      `;

      let mapped = result.map(s => {
        let isFree = false
        if(s.free_baggage > 0){
            isFree = true
        }

        let sClass = s.class.toLowerCase()
        sClass = sClass.charAt(0).toUpperCase() + sClass.slice(1);
        
        let date = new Date(s.flight_date).toISOString()
        date = date.split('T')[0]

        return ({
            flight_id: s.flight_id,
            flight_date: date,
            departure_time: s.departure_time,
            arrival_time: s.arrival_time,
            duration: s.duration,
            price: s.price,
            airline_name: s.short_name,
            class: sClass,
            departure_code: s.dept_code,
            arrival_code: s.arr_code,
            baggage: isFree,
            airline_icon_url: s.iconUrl
        })
      })

      res.status(200).json({
        status: true,
        message: "OK",
        data: mapped,
      });
    } catch (err) {
      next(err);
    }
  },

  add: async (req, res, next) => {
    try {
        const resu = await prisma.flights.create({
            data: {
                "departure_airport_id": 50,
                "arrival_airport_id": 11,
                "airplane_id": 7,
                "flight_number": "ID-6540",
                "flight_date": "2024-06-02",
                "departure_terminal": "Terminal 2D",
                "arrival_terminal": "Terminal Domestic",
                "free_baggage": "20",
                "cabin_baggage": "7",
                "class": "ECONOMY",
                "entertainment": false,
                "departure_time": "02:00",
                "arrival_time": "06:10",
                "price": 2443100,
                "capacity": 85,
                "duration": 250
              }
        })

        res.json(resu)
    } catch (err) {
        next(err)
    }
  }
};
