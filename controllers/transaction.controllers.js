const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

getAllTransactions = async (req, res, next) => {
  const { lt, gte, q } = req.query;

  try {
    const whereClause = {};
    if (lt) whereClause.created_at = { lt: new Date(lt) };
    if (gte) whereClause.created_at = { gte: new Date(gte) };
    if (q) whereClause.booking_code = q;

    const transactions = await prisma.transactions.findMany({
      where: whereClause,
      select: {
        transaction_id: true,
        total_price: true,
        tax: true,
        booking_code: true,
        status: true,
        ticket: {
          select: {
            total_adult: true,
            total_children: true,
            total_baby: true,
            departure_flight: {
              select: {
                flight_date: true,
                departure_time: true,
                arrival_time: true,
                departure_airport: {
                  select: { name: true },
                },
                arrival_airport: {
                  select: { name: true },
                },
                departure_terminal: true,
                arrival_terminal: true,
                duration: true,
                class: true,
                airplane: {
                  select: {
                    model: true,
                    airline: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
            },
            arrival_flight: {
              select: {
                flight_date: true,
                departure_time: true,
                arrival_time: true,
                departure_airport: {
                  select: { name: true },
                },
                arrival_airport: {
                  select: { name: true },
                },
                departure_terminal: true,
                arrival_terminal: true,
                duration: true,
                class: true,
                airplane: {
                  select: {
                    model: true,
                    airline: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
            },
            passengers: {
              select: {
                title: true,
                name: true,
                identity_number: true,
              },
            },
          },
        },
      },
    });

    if (transactions.length === 0) {
      return res.status(400).json({
        status: false,
        message: "Data not found",
        data: null,
      });
    }

    const formattedTransactions = transactions.map((transaction) => {
      const departureFlight = transaction.ticket.departure_flight;
      let departureArrivalDate = departureFlight.flight_date;
      if (departureFlight.departure_time > departureFlight.arrival_time) {
        departureArrivalDate = addOneDay(departureArrivalDate);
      }

      let arrivalFlight,
        arrivalArrivalDate = null;
      if (transaction.ticket.arrival_flight) {
        arrivalFlight = transaction.ticket.arrival_flight;
        arrivalArrivalDate = arrivalFlight.flight_date;
        if (arrivalFlight.departure_time > arrivalFlight.arrival_time) {
          arrivalArrivalDate = addOneDay(arrivalArrivalDate);
        }
      }

      return {
        transaction_id: transaction.transaction_id,
        total_price: transaction.total_price,
        tax: transaction.tax,
        booking_code: transaction.booking_code,
        status: transaction.status,
        total_adult: transaction.ticket.total_adult,
        total_children: transaction.ticket.total_children,
        total_baby: transaction.ticket.total_baby,
        departure_flight: {
          flight_date: departureFlight.flight_date,
          arrival_date: departureArrivalDate,
          departure_time: departureFlight.departure_time,
          arrival_time: departureFlight.arrival_time,
          departure_airport: departureFlight.departure_airport.name,
          arrival_airport: departureFlight.arrival_airport.name,
          departure_terminal: departureFlight.departure_terminal,
          arrival_terminal: departureFlight.arrival_terminal,
          duration: departureFlight.duration,
          class: departureFlight.class,
          airplane_model: departureFlight.airplane.model,
          airline: departureFlight.airplane.airline.name,
        },
        arrival_flight: arrivalFlight
          ? {
              flight_date: arrivalFlight.flight_date,
              arrival_date: arrivalArrivalDate,
              departure_time: arrivalFlight.departure_time,
              arrival_time: arrivalFlight.arrival_time,
              departure_airport: arrivalFlight.departure_airport.name,
              arrival_airport: arrivalFlight.arrival_airport.name,
              departure_terminal: arrivalFlight.departure_terminal,
              arrival_terminal: arrivalFlight.arrival_terminal,
              duration: arrivalFlight.duration,
              class: arrivalFlight.class,
              airplane_model: arrivalFlight.airplane.model,
              airline: arrivalFlight.airplane.airline.name,
            }
          : null,
        passengers: transaction.ticket.passengers.map((passenger) => ({
          title: passenger.title,
          name: passenger.name,
          id: passenger.identity_number,
        })),
      };
    });

    res.status(200).json({
      status: true,
      message: "OK",
      data: transactions,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: "Internal Server Error",
      data: null,
    });
    next(error);
  }
};

processPayment = async (req, res, next) => {
  const {
    booking_code,
    payment_method,
    card_number,
    card_holder_name,
    cvv,
    expiry_date,
  } = req.body;
  if (
    !booking_code ||
    !payment_method ||
    !card_number ||
    !card_holder_name ||
    !cvv ||
    !expiry_date
  ) {
    return res.status(400).json({
      status: false,
      message: "All fields are required",
      data: null,
    });
  }

  try {
    const transaction = await prisma.transactions.findUnique({
      where: { booking_code },
    });

    if (!transaction || transaction.status !== "UNPAID") {
      return res.status(400).json({
        status: false,
        message: "Invalid transaction state or booking code",
        data: null,
      });
    }

    const updatedTransaction = await prisma.transactions.update({
      where: { booking_code },
      data: { status: "ISSUED" },
    });

    res.status(200).json({
      status: true,
      message: "Payment Successful",
      data: { status: "ISSUED" },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllTransactions, processPayment };
