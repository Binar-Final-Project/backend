const { PrismaClient } = require("@prisma/client");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const {getHTML, sendTicket} = require('../libs/mailer')
const path = require('path')
const fs = require('fs')
const {generatePdf} = require('../libs/pdf')

const rupiah = (number)=>{
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR"
  }).format(number);
}

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
  try {
      const condition = {
          where: {
              user_id: req.user.user_id
          },
          orderBy: {
              ticket: {
                  departure_flight: {
                      flight_date: 'desc'
                  }
              }
          },
          include: {
              ticket: {
                  include: {
                      departure_flight : {
                          include : {
                              departure_airport : true,
                              arrival_airport : true,
                              airplane : {
                                  include: {
                                      airline: true
                                  }
                              }
                          }
                      },
                      arrival_flight : {
                          include : {
                              departure_airport : true,
                              arrival_airport : true,
                              airplane : {
                                  include: {
                                      airline: true
                                  }
                              }
                          }
                      },
                      passengers : true
                  }
              }
          }
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
      if(req.query.q) {
          condition.where = {
              ...condition.where,
              booking_code : {
                  // case-insensitive search
                  contains: req.query.q,
                  mode: 'insensitive'
              }
          };
      };

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
      if(req.query.lt && req.query.gte) {
          condition.where = {
              AND: [
                  condition.where,
                  {
                      ticket: {
                          departure_flight :{
                              flight_date: {
                                  lte: req.query.lt
                              }
                          }
                      }
                  },
                  {
                      ticket: {
                          departure_flight :{
                              flight_date: {
                                  gte: req.query.gte
                              }
                          }
                      }
                  },
              ]
          }

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
      const transactions = await prisma.transactions.findMany(condition);
      
      transactions.map(transaction => {
          transaction.total_adult = transaction.ticket.total_adult;
          transaction.total_children = transaction.ticket.total_children;
          transaction.total_baby = transaction.ticket.total_baby;
          transaction.passengers = transaction.ticket.passengers.map(passenger => {
              passenger.date_of_birth = passenger.date_of_birth.toISOString().split('T')[0];
              passenger.valid_until = passenger.valid_until.toISOString().split('T')[0];
              return passenger;                
          });
          
          // departure_flight
          if(transaction?.ticket?.departure_flight){
              transaction.departure_flight = transaction.ticket.departure_flight;
              transaction.departure_flight.departure_airport = transaction.ticket.departure_flight.departure_airport.name;
              transaction.departure_flight.arrival_airport = transaction.ticket.departure_flight.arrival_airport.name;
              transaction.departure_flight.airplane_model = transaction.ticket.departure_flight.airplane.model;
              transaction.departure_flight.airline = transaction.ticket.departure_flight.airplane.airline.name;
              transaction.departure_flight.flight_date = transaction.departure_flight.flight_date.split('T')[0];
              delete transaction.departure_flight.airplane;
          }else{
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
          // arrival_flight
          if(transaction?.ticket?.arrival_flight){
              transaction.return_flight = transaction.ticket.arrival_flight;
              transaction.return_flight.departure_airport = transaction.ticket.arrival_flight.departure_airport.name;
              transaction.return_flight.arrival_airport = transaction.ticket.arrival_flight.arrival_airport.name;
              transaction.return_flight.airplane_model = transaction.ticket.arrival_flight.airplane.model;
              transaction.return_flight.airline = transaction.ticket.arrival_flight.airplane.airline.name;
              transaction.return_flight.flight_date = transaction.ticket.arrival_flight.flight_date.split('T')[0];
              delete transaction.return_flight.airplane;
          }else{
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

    res.status(200).json({
      status: true,
      message: "Payment Successful",
      data: { status: updatedTransaction.status },
    });
  } catch (error) {
    next(error);
  }
};
      res.status(200).json({
          status: true,
          message: "OK",
          data: transactions
      });
  } catch (error) {
      console.log (error);
      res.status(500).json({ message: 'Something went wrong' });
  }
}

module.exports = { history, processPayment };

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
      totalFare: rupiah(data.total_price),
      tax: data.tax,
      paymentMethod: data.payment_method,
      cardNumber: last4,
      flights: [
        {
          number: data.ticket.departure_flight.flight_number,
          class: data.ticket.departure_flight.class,
          dept_airport: data.ticket.departure_flight.departure_airport.name,
          dept_code: data.ticket.departure_flight.departure_airport.code,
          arr_airport: data.ticket.departure_flight.arrival_airport.name,
          arr_code: data.ticket.departure_flight.arrival_airport.code,
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
          price: rupiah(data.total_price - data.tax),
        },
        {
          description: "Tax (10%)",
          price: rupiah(data.tax),
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
        dept_code: data.ticket.arrival_flight.departure_airport.code,
        arr_airport: data.ticket.arrival_flight.arrival_airport.name,
        arr_code: data.ticket.arrival_flight.arrival_airport.code,
        dept_time: data.ticket.arrival_flight.departure_time,
        arr_time: data.ticket.arrival_flight.arrival_time,
        date: data.ticket.arrival_flight.flight_date,
        airplane: data.ticket.arrival_flight.airplane.model,
        airline: data.ticket.arrival_flight.airplane.airline.short_name,
      };
    }

    const htmlContent = await getHTML("eticket.ejs", content);

    const fileName = `eticket-${content.bookingNumber}${Date.now().toLocaleString()}.pdf`

    generatePdf(htmlContent, async (error, pdfBuffer) => {
      if (error) {
        // Handle error
        return res.status(500).json({ message: "Error generating PDF" });
      }

      // Send initial response (e.g., processing started)
      res.status(202).json({ message: "E-ticket will sent to your email!" });

      // Handle PDF buffer asynchronously (e.g., save to disk)
      await sendTicket(req.user.email, pdfBuffer, fileName)
      console.log('Success')
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { history, printTicket };
