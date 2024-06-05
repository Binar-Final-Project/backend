const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const {getHTML} = require('../libs/mailer')
const path = require('path')
const fs = require('fs')
const {generatePdf} = require('../libs/pdf')

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
      transaction.passengers = transaction.ticket.passengers;

      // departure_flight
      transaction.departure_flight = transaction.ticket.departure_flight;
      transaction.departure_flight.departure_airport =
        transaction.ticket.departure_flight.departure_airport.name;
      transaction.departure_flight.arrival_airport =
        transaction.ticket.departure_flight.arrival_airport.name;
      transaction.departure_flight.airplane_model =
        transaction.ticket.departure_flight.airplane.model;
      transaction.departure_flight.airline =
        transaction.ticket.departure_flight.airplane.airline.name;
      delete transaction.departure_flight.airplane;

      // arrival_flight
      transaction.arrival_flight = transaction.ticket.arrival_flight;
      transaction.arrival_flight.departure_airport =
        transaction.ticket.arrival_flight.departure_airport.name;
      transaction.arrival_flight.arrival_airport =
        transaction.ticket.arrival_flight.arrival_airport.name;
      transaction.arrival_flight.airplane_model =
        transaction.ticket.arrival_flight.airplane.model;
      transaction.arrival_flight.airline =
        transaction.ticket.arrival_flight.airplane.airline.name;
      delete transaction.arrival_flight.airplane;

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

const printTicket = async (req, res, next) => {
  try {
    const { code } = req.params;

    let data = await prisma.transactions.findUnique({
      where: { booking_code: code },
      select: {
        user_id: true,
        total_price: true,
        tax: true,
        booking_code: true,
        card_number: true,
        payment_method: true,
        status: true,
        ticket: {
          select: {
            total_adult: true,
            total_baby: true,
            total_children: true,
            departure_flight: {
              include: {
                airplane: {
                  include: {
                    airline: true,
                  },
                },
                departure_airport: true,
                arrival_airport: true,
              },
            },
            arrival_flight: {
              include: {
                airplane: {
                  include: {
                    airline: true,
                  },
                },
                departure_airport: true,
                arrival_airport: true,
              },
            },
            passengers: true,
          },
        },
      },
    });

    if (!data) {
      return res.status(400).json({
        status: false,
        message: "Data not found",
        data: null,
      });
    }

    if(data.user_id !== req.user.user_id){
      return res.status(400).json({
        status: false,
        message: "This is not yours",
        data: null,
      });
    }

    if (data.status !== "ISSUED") {
      return res.status(400).json({
        status: false,
        message: "You haven't paid for the ticket yet",
        data: null,
      });
    }

    let last4 = data.card_number;
    if (typeof last4 === "string") {
      last4 = last4.slice(-4);
    }

    let content = {
      bookingNumber: data.booking_code,
      totalFare: data.total_price,
      tax: data.tax,
      paymentMethod: data.payment_method,
      cardNumber: last4,
      flights: [
        {
          number: data.ticket.departure_flight.flight_number,
          class: data.ticket.departure_flight.class,
          dept_airport: data.ticket.departure_flight.departure_airport.name,
          arr_airport: data.ticket.departure_flight.arrival_airport.name,
          dept_time: data.ticket.departure_flight.departure_time,
          arr_time: data.ticket.departure_flight.arrival_time,
          date: data.ticket.departure_flight.flight_date,
          airplane: data.ticket.departure_flight.airplane.model,
          airline: data.ticket.departure_flight.airplane.airline.short_name,
        },
      ],
      passengers: data.ticket.passengers,
      purchases: [
        {
          description: "Fare",
          price: data.total_price - data.tax,
        },
        {
          description: "Tax (10%)",
          price: data.tax,
        },
        {
          description: "Number of Passengers",
          price:
            data.ticket.total_adult +
            data.ticket.total_children +
            data.ticket.total_baby,
        },
      ],
    };

    if (data.ticket.arrival_flight) {
      content.flights[1] = {
        number: data.ticket.arrival_flight.flight_number,
        class: data.ticket.arrival_flight.class,
        dept_airport: data.ticket.arrival_flight.departure_airport.name,
        arr_airport: data.ticket.arrival_flight.arrival_airport.name,
        dept_time: data.ticket.arrival_flight.departure_time,
        arr_time: data.ticket.arrival_flight.arrival_time,
        date: data.ticket.arrival_flight.flight_date,
        airplane: data.ticket.arrival_flight.airplane.model,
        airline: data.ticket.arrival_flight.airplane.airline.short_name,
      };
    }

    const htmlContent = await getHTML("eticket.ejs", content);

    const filePath = path.join(__dirname, "eticket.pdf");

    generatePdf(htmlContent, (error, pdfBuffer) => {
      if (error) {
        // Handle error
        return res.status(500).json({ message: "Error generating PDF" });
      }

      // Send initial response (e.g., processing started)
      res.status(202).json({ message: "E-ticket will sent to your email!" });

      // Handle PDF buffer asynchronously (e.g., save to disk)
      fs.writeFile(filePath, pdfBuffer, (writeFileError) => {
        if (writeFileError) {
          console.error("Error writing PDF to file:", writeFileError);
          // Handle write error if needed
        } else {
          console.log("PDF saved successfully");
        }
      });
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { history, printTicket };
