const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const history = async (req, res) => {
  try {
    const condition = {
      where: {
        user_id: req.user.user_id,
      },
      orderBy: {
        ticket: {
          departure_flight: {
            flight_date: "desc",
          },
        },
      },
      include: {
        ticket: {
          include: {
            departure_flight: {
              include: {
                departure_airport: true,
                arrival_airport: true,
                airplane: {
                  include: {
                    airline: true,
                  },
                },
              },
            },
            arrival_flight: {
              include: {
                departure_airport: true,
                arrival_airport: true,
                airplane: {
                  include: {
                    airline: true,
                  },
                },
              },
            },
            passengers: true,
          },
        },
      },
    };

    if (req.query.q) {
      condition.where = {
        ...condition.where,
        booking_code: {
          // case-insensitive search
          contains: req.query.q,
          mode: "insensitive",
        },
      };
    }

    if (req.query.lt && req.query.gte) {
      condition.where = {
        AND: [
          condition.where,
          {
            ticket: {
              departure_flight: {
                flight_date: {
                  lte: req.query.lt,
                },
              },
            },
          },
          {
            ticket: {
              departure_flight: {
                flight_date: {
                  gte: req.query.gte,
                },
              },
            },
          },
        ],
      };
    }

    const transactions = await prisma.transactions.findMany(condition);

    transactions.map((transaction) => {
      transaction.total_adult = transaction.ticket.total_adult;
      transaction.total_children = transaction.ticket.total_children;
      transaction.total_baby = transaction.ticket.total_baby;
      transaction.passengers = transaction.ticket.passengers.map(
        (passenger) => {
          passenger.date_of_birth = passenger.date_of_birth
            .toISOString()
            .split("T")[0];
          passenger.valid_until = passenger.valid_until
            .toISOString()
            .split("T")[0];
          return passenger;
        }
      );

      // departure_flight
      if (transaction?.ticket?.departure_flight) {
        transaction.departure_flight = transaction.ticket.departure_flight;
        transaction.departure_flight.departure_airport =
          transaction.ticket.departure_flight.departure_airport.name;
        transaction.departure_flight.arrival_airport =
          transaction.ticket.departure_flight.arrival_airport.name;
        transaction.departure_flight.airplane_model =
          transaction.ticket.departure_flight.airplane.model;
        transaction.departure_flight.airline =
          transaction.ticket.departure_flight.airplane.airline.name;
        transaction.departure_flight.flight_date =
          transaction.departure_flight.flight_date.split("T")[0];
        delete transaction.departure_flight.airplane;
      } else {
        transaction.departure_flight = null;
      }

      // arrival_flight
      if (transaction?.ticket?.arrival_flight) {
        transaction.return_flight = transaction.ticket.arrival_flight;
        transaction.return_flight.departure_airport =
          transaction.ticket.arrival_flight.departure_airport.name;
        transaction.return_flight.arrival_airport =
          transaction.ticket.arrival_flight.arrival_airport.name;
        transaction.return_flight.airplane_model =
          transaction.ticket.arrival_flight.airplane.model;
        transaction.return_flight.airline =
          transaction.ticket.arrival_flight.airplane.airline.name;
        transaction.return_flight.flight_date =
          transaction.ticket.arrival_flight.flight_date.split("T")[0];
        delete transaction.return_flight.airplane;
      } else {
        transaction.return_flight = null;
      }

      delete transaction.created_at;
      delete transaction.updated_at;
      delete transaction.ticket;
      return transaction;
    });

    res.status(200).json({
      status: true,
      message: "OK",
      data: transactions,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

const processPayment = async (req, res, next) => {
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
      data: {
        status: "ISSUED",
        payment_method,
        card_number,
        card_holder_name,
        cvv,
        expiry_date,
      },
    });

    await prisma.notifications.create({
      data: {
        title: "Payment Successful",
        description: `Your payment for booking code ${booking_code} has been successfully processed.`,
        status: "unread",
        user_id: transaction.user_id,
      },
    });

    res.status(200).json({
      status: true,
      message: "Payment Successful",
      data: { status: updatedTransaction.status },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { history, processPayment };