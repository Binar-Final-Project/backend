const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();

const addOneDay = (dateString) => {
  const date = new Date(dateString);
  date.setDate(date.getDate() + 1);
  return date.toISOString().split('T')[0];
};

module.exports = {
  search: async (req, res, next) => {
    try {
      const { departure_code, arrival_code, departure_date, total_passenger } = req.body;
      const seat_class = req.body.seat_class.toUpperCase();

      const sortFilter = ['price', 'departure_time', 'arrival_time', 'duration', 'asc', 'desc']

      let sort = req.query.sort || "PRICE.ASC";

      let sortBy;
      let sortOrder;
      if(typeof sort === 'string'){
        sortBy = sort.split('.')[0]
        sortOrder = sort.split('.')[1]
      }

      if(!sortFilter.includes(sortBy.toLowerCase()) || !sortFilter.includes(sortOrder.toLowerCase())){
        return res.status(400).json({
          status: false,
          message: 'Wrong Sort Values',
          data: null
        })
      }

      sortBy = Prisma.sql([sortBy.toUpperCase()]);
      sortOrder = Prisma.sql([sortOrder.toUpperCase()]);
      
      let page = req.query.page || 1
      const limit = 10
      const offset = (page-1)*limit

      const totalPageResult = await prisma.$queryRaw`
        WITH purchased_ticket AS (
          SELECT t.departure_flight_id, COUNT(t.departure_flight_id) as count
          FROM tickets t
          INNER JOIN transactions tr ON tr.ticket_id = t.ticket_id
          WHERE tr.status = 'ISSUED'
          GROUP BY t.departure_flight_id
        )
        SELECT f.*
        FROM
          flights f
          INNER JOIN airports d_airport ON d_airport.airport_id = f.departure_airport_id
          INNER JOIN airports a_airport ON a_airport.airport_id = f.arrival_airport_id
          INNER JOIN airplanes airplane ON airplane.airplane_id = f.airplane_id
          INNER JOIN airlines airline ON airline.airline_id = airplane.airline_id
          LEFT JOIN purchased_ticket pt ON pt.departure_flight_id = f.flight_id
        WHERE
          f.flight_date::text LIKE '%' || ${departure_date} || '%'
          AND d_airport.code = ${departure_code}
          AND a_airport.code = ${arrival_code}
          AND f.class = ${seat_class}
          AND f.capacity - COALESCE(pt.count, 0) >= ${total_passenger};
      `;

      const totalPage = Math.ceil(totalPageResult.length / limit)
      if(page > totalPage){
        return res.status(400).json({
          status: false,
          message: 'Page not found',
          data: null
        })
      }

      const result = await prisma.$queryRaw`
        WITH purchased_ticket AS (
          SELECT t.departure_flight_id, COUNT(t.departure_flight_id) as count
          FROM tickets t
          INNER JOIN transactions tr ON tr.ticket_id = t.ticket_id
          WHERE tr.status = 'ISSUED'
          GROUP BY t.departure_flight_id
        )
        SELECT
          f.*,
          d_airport.code as dept_code,
          d_airport.name as dept_name,
          d_airport.city as dept_city,
          a_airport.code as arr_code,
          a_airport.name as arr_name,
          a_airport.city as arr_city,
          airplane.*,
          airline.*,
          COALESCE(f.capacity - pt.count, f.capacity) as remaining_capacity
        FROM
          flights f
          INNER JOIN airports d_airport ON d_airport.airport_id = f.departure_airport_id
          INNER JOIN airports a_airport ON a_airport.airport_id = f.arrival_airport_id
          INNER JOIN airplanes airplane ON airplane.airplane_id = f.airplane_id
          INNER JOIN airlines airline ON airline.airline_id = airplane.airline_id
          LEFT JOIN purchased_ticket pt ON pt.departure_flight_id = f.flight_id
        WHERE
          f.flight_date::text LIKE '%' || ${departure_date} || '%'
          AND d_airport.code = ${departure_code}
          AND a_airport.code = ${arrival_code}
          AND f.class = ${seat_class}
          AND f.capacity - COALESCE(pt.count, 0) >= ${total_passenger}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT ${limit}
        OFFSET ${offset};
      `;

      let mapped = result.map(s => {
        let isFree = false
        if(s.free_baggage > 0){
            isFree = true
        }

        let sClass = s.class.toLowerCase()
        sClass = sClass.charAt(0).toUpperCase() + sClass.slice(1);
        
        let date = new Date(s.flight_date).toISOString().split('T')[0]

        let arrivalDate = date
        if(s.departure_time > s.arrival_time){
          arrivalDate = addOneDay(date)
        }

        return ({
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
        })
      })

      res.status(200).json({
        status: true,
        message: "OK",
        data: {total_page: totalPage, flights: mapped}
      });
    } catch (err) {
      next(err);
    }
  },
};
