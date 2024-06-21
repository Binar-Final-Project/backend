const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();

const addOneDay = (dateString) => {
  const date = new Date(dateString);
  date.setDate(date.getDate() + 1);
  return date.toISOString().split("T")[0];
};

const lookUpId = async (departure_code, arrival_code) => {
  const dept = await prisma.airports.findUnique({
    where: { code: departure_code },
  });
  const arr = await prisma.airports.findUnique({
    where: { code: arrival_code },
  });

  if (!dept || !arr) {
    return null;
  }

  return { dept_id: dept.airport_id, arr_id: arr.airport_id };
};

const filterSort = (sort) => {
  const sortFilter = [
    "price",
    "departure_time",
    "arrival_time",
    "duration",
    "asc",
    "desc",
  ];

  let sortQ;
  if (sort === undefined || sort === "undefined" || !sort) {
    sortQ = "PRICE.ASC";
  } else {
    sortQ = sort;
  }

  let sortBy, sortOrder;
  [sortBy, sortOrder] = sort.split(".");

  if (
    !sortFilter.includes(sortBy.toLowerCase()) ||
    !sortFilter.includes(sortOrder.toLowerCase())
  ) {
    return null;
  }

  if (typeof sortBy === "string" || typeof sortOrder === "string") {
    sortBy = sortBy.toUpperCase();
    sortOrder = sortOrder.toUpperCase();
  }

  return { sortBy, sortOrder };
};

module.exports = {
  search: async (req, res, next) => {
    try {
      let { departure_code, arrival_code, departure_date, total_passenger } =
        req.body;
      const seat_class = req.body.seat_class.toUpperCase();

      let q = req.query.sort;
      if (!q) {
        q = "PRICE.ASC";
      }
      let sort = filterSort(q);
      if (sort === null) {
        return res.status(400).json({
          status: false,
          message: "Parameter sort tidak valid",
          data: null,
        });
      }

      let sortBy = Prisma.sql([sort.sortBy]);
      let sortOrder = Prisma.sql([sort.sortOrder]);

      let page;
      if (req.query.page === undefined || req.query.page === "undefined") {
        page = 1;
      }
      page = req.query.page || 1;
      const limit = 10;
      const offset = (page - 1) * limit;

      let airports = await lookUpId(departure_code, arrival_code);
      if (airports === null) {
        return res.status(400).json({
          status: false,
          message: "Kode bandara keberangkatan/kedatangan salah",
          data: null,
        });
      }

      const result = await prisma.$queryRaw`
        WITH purchased_ticket AS (
          SELECT
            t.departure_flight_id,
            COUNT(t.departure_flight_id) AS count
          FROM
            tickets t
            INNER JOIN transactions tr ON tr.ticket_id = t.ticket_id
          WHERE
            tr.status = 'ISSUED'
          GROUP BY
            t.departure_flight_id
        ),
        flight_search AS (
          SELECT
            f.*,
            d_airport.code AS dept_code,
            d_airport.name AS dept_name,
            d_airport.city AS dept_city,
            a_airport.code AS arr_code,
            a_airport.name AS arr_name,
            a_airport.city AS arr_city,
            airplane.*,
            airline.*,
            COALESCE(f.capacity - pt.count, f.capacity) AS remaining_capacity,
            ROW_NUMBER() OVER (ORDER BY ${sortBy} ${sortOrder}) AS row_number,
            COUNT(*) OVER () AS total_count
          FROM
            flights f
            INNER JOIN airports d_airport ON d_airport.airport_id = f.departure_airport_id
            INNER JOIN airports a_airport ON a_airport.airport_id = f.arrival_airport_id
            INNER JOIN airplanes airplane ON airplane.airplane_id = f.airplane_id
            INNER JOIN airlines airline ON airline.airline_id = airplane.airline_id
            LEFT JOIN purchased_ticket pt ON pt.departure_flight_id = f.flight_id
          WHERE
            f.flight_date = ${departure_date + "T00:00:00Z"}
            AND d_airport.airport_id = ${airports.dept_id}
            AND a_airport.airport_id = ${airports.arr_id}
            AND f.class = ${seat_class}
            AND f.capacity - COALESCE(pt.count, 0) >= ${total_passenger}
        )
        SELECT
          *
        FROM
          flight_search
        WHERE
          row_number BETWEEN ${(page - 1) * limit + 1} AND ${page * limit};
      `;

      // Extract total count from the first row of the result set
      const totalPage = Math.ceil(Number(result[0]?.total_count) / limit);

      if (page > totalPage) {
        return res.status(400).json({
          status: false,
          message: "Halaman tidak ditemukan",
          data: null,
        });
      }
      let mapped = result.map((s) => {
        let isFree = false;
        if (s.free_baggage > 0) {
          isFree = true;
        }

        let sClass = s.class.toLowerCase();
        sClass = sClass.charAt(0).toUpperCase() + sClass.slice(1);

        let date = new Date(s.flight_date).toISOString().split("T")[0];

        let arrivalDate = date;
        if (s.departure_time > s.arrival_time) {
          arrivalDate = addOneDay(date);
        }

        return {
          flight_id: s.flight_id,
          flight_date: date,
          arrival_date: arrivalDate,
          departure_time: s.departure_time,
          arrival_time: s.arrival_time,
          departure_code: s.dept_code,
          arrival_code: s.arr_code,
          departure_airport: s.dept_name,
          arrival_airport: s.arr_name,
          departure_city: s.dept_city,
          arrival_city: s.arr_city,
          departure_terminal: s.departure_terminal,
          arrival_terminal: s.arrival_terminal,
          duration: s.duration,
          price: s.price,
          class: sClass,
          baggage: isFree,
          free_baggage: s.free_baggage,
          cabin_baggage: s.cabin_baggage,
          flight_entertainment: s.entertainment,
          airplane_model: s.model,
          airline_short_name: s.short_name,
          airline_name: s.name,
          airline_icon_url: s.iconUrl,
        };
      });

      res.status(200).json({
        status: true,
        message: "OK",
        data: { total_page: totalPage, flights: mapped },
      });
    } catch (err) {
      next(err);
    }
  },

  getCheapestFlights: async (req, res, next) => {
    try {
      const currentDate = new Date().toISOString().split("T")[0] + "T00:00:00Z";

      const cheapestFlightsToday = await prisma.$queryRaw`
        SELECT 
          MIN(f.price) as min_price,
          f.flight_id,
          f.flight_number,
          f.flight_date,
          f.departure_time,
          f.arrival_time,
          f.class,
          da.name as departure_airport_name,
          da.city as departure_airport_city,
          da.code as departure_airport_code,
          aa.name as arrival_airport_name,
          aa.city as arrival_airport_city,
          aa.code as arrival_airport_code,
          a.model as airplane_model,
          al.*
        FROM flights f
        JOIN airports da ON f.departure_airport_id = da.airport_id
        JOIN airports aa ON f.arrival_airport_id = aa.airport_id
        JOIN airplanes a ON f.airplane_id = a.airplane_id
        JOIN airlines al ON a.airline_id = al.airline_id
        WHERE f.flight_date = ${currentDate}
        GROUP BY 
          f.flight_id,
          f.flight_number,
          f.flight_date,
          f.departure_time,
          f.arrival_time,
          f.class,
          da.name,
          da.city,
          aa.name,
          aa.city,
          a.model,
          al.airline_id,
          da.code,
          aa.code
        LIMIT 1000
      `;

      if(!cheapestFlightsToday){
        return res.status(400).json({
          status: false,
          message: 'Data tidak ditemukan',
          data: null
        })
      }

      const mapped = cheapestFlightsToday.map(f => {
        return {
          flight_id: f.flight_id,
          flight_number: f.flight_number,
          flight_date: f.flight_date.split('T')[0],
          departure_time: f.departure_time,
          arrival_time: f.arrival_time,
          class: f.class,
          price: f.min_price,
          airplane: f.airplane_model,
          airline: f.name,
          airline_icon: f.iconUrl,
          departure: {
            airport_name: f.departure_airport_name,
            airport_city: f.departure_airport_city,
            airport_code: f.departure_airport_code
          },
          arrival: {
            airport_name: f.arrival_airport_name,
            airport_city: f.arrival_airport_city,
            airport_code: f.arrival_airport_code
          }
        }
      })
      res.status(200).json({
        status: true,
        message: "OK",
        data: mapped,
      });
    } catch (error) {
      next(error);
    }
  },
};
