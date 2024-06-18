const { PrismaClient, transaction_status } = require("@prisma/client");
const prisma = new PrismaClient();
const { getHTML, sendTicket } = require("../libs/mailer");
const path = require("path");
const fs = require("fs");
const { generatePdf } = require("../libs/pdf");

const rupiah = (number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
  }).format(number);
};

const history = async (req, res, next) => {
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
          contains: req.query.q,
          mode: "insensitive",
        },
      };
    }

    if (req.query.lt && req.query.gte) {
      condition.where = {
        ...condition.where,
        created_at: {
          lt: new Date(req.query.lt),
          gte: new Date(req.query.gte),
        },
      };
    } else if (req.query.lt) {
      condition.where = {
        ...condition.where,
        created_at: {
          lt: new Date(req.query.lt),
        },
      };
    } else if (req.query.gte) {
      condition.where = {
        ...condition.where,
        created_at: {
          gte: new Date(req.query.gte),
        },
      };
    }

    const transactions = await prisma.transactions.findMany(condition);
    const dataReturn = transactions.map((t) => {
      const tr = {};
      tr.flights = [t.ticket.departure_flight.flight_id];
      tr.transaction_id = t.transaction_id;
      tr.total_price = t.total_price;
      tr.total_before_tax = +t.total_price - +t.tax;
      tr.tax = t.tax;
      tr.payment_method = t.payment_method;
      tr.card_number = t.card_number;
      tr.card_holder_name = t.card_holder_name;
      tr.cvv = t.cvv;
      tr.expiry_date = t.expiry_date;
      tr.booking_code = t.booking_code;
      tr.status = t.status;
      tr.total_adult = t.ticket.total_adult;
      tr.total_children = t.ticket.total_children;
      tr.total_baby = t.ticket.total_baby;
      tr.passengers = t.ticket.passengers.map((passenger) => {
        passenger.date_of_birth = String(
          passenger.date_of_birth.toISOString().split("T")[0],
        );
        passenger.valid_until = String(
          passenger.valid_until.toISOString().split("T")[0],
        );
        return passenger;
      });
      tr.departure_flight = {
        flight_date: t.ticket.departure_flight.flight_date.split("T")[0],
        departure_time: t.ticket.departure_flight.departure_time,
        arrival_time: t.ticket.departure_flight.arrival_time,
        departure_terminal: t.ticket.departure_flight.departure_terminal,
        arrival_terminal: t.ticket.departure_flight.arrival_terminal,
        class: t.ticket.departure_flight.class,
        price: t.ticket.departure_flight.price,
        baby_price: +t.ticket.departure_flight.price * 0.1,
        duration: t.ticket.departure_flight.duration,
        capacity: t.ticket.departure_flight.capacity,
        free_baggage: t.ticket.departure_flight.free_baggage,
        cabin_baggage: t.ticket.departure_flight.cabin_baggage,
        entertainment: t.ticket.departure_flight.entertainment,
        departure_airport: t.ticket.departure_flight.departure_airport.name,
        departure_city: t.ticket.departure_flight.departure_airport.city,
        arrival_airport: t.ticket.departure_flight.arrival_airport.name,
        arrival_city: t.ticket.departure_flight.arrival_airport.city,
        airplane_model: t.ticket.departure_flight.airplane.model,
        airline: t.ticket.departure_flight.airplane.airline.name,
      };

      if (t?.ticket?.arrival_flight) {
        tr.flights[1] = t.ticket.arrival_flight.flight_id;
        tr.return_flight = {
          flight_date: t.ticket.arrival_flight.flight_date.split("T")[0],
          departure_time: t.ticket.arrival_flight.departure_time,
          arrival_time: t.ticket.arrival_flight.arrival_time,
          departure_terminal: t.ticket.arrival_flight.departure_terminal,
          arrival_terminal: t.ticket.arrival_flight.arrival_terminal,
          class: t.ticket.arrival_flight.class,
          price: t.ticket.arrival_flight.price,
          baby_price: +t.ticket.arrival_flight.price * 0.1,
          duration: t.ticket.arrival_flight.duration,
          capacity: t.ticket.arrival_flight.capacity,
          free_baggage: t.ticket.arrival_flight.free_baggage,
          cabin_baggage: t.ticket.arrival_flight.cabin_baggage,
          entertainment: t.ticket.arrival_flight.entertainment,
          departure_airport: t.ticket.arrival_flight.departure_airport.name,
          departure_city: t.ticket.arrival_flight.departure_airport.city,
          arrival_airport: t.ticket.arrival_flight.arrival_airport.name,
          arrival_city: t.ticket.arrival_flight.arrival_airport.city,
          airplane_model: t.ticket.arrival_flight.airplane.model,
          airline: t.ticket.arrival_flight.airplane.airline.name,
        };
      } else {
        tr.return_flight = null;
      }

      return tr;
    });

    res.status(200).json({
      status: true,
      message: "OK",
      data: dataReturn,
    });
  } catch (error) {
    console.log(error);
    next(error);
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

    if (!transaction) {
      return res.status(400).json({
        status: false,
        message: "Invalid transaction state or booking code",
        data: null,
      });
    }

    if (transaction.status === transaction_status.ISSUED) {
      return res.status(400).json({
        status: false,
        message: "Transaction has been paid",
        data: null,
      });
    }

    if (transaction.status === transaction_status.CANCELLED) {
      return res.status(400).json({
        status: false,
        message: "Transaction has been canceled",
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

    if (data.user_id !== req.user.user_id) {
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

    const fileName = `eticket-${
      content.bookingNumber
    }${Date.now().toLocaleString()}.pdf`;

    generatePdf(htmlContent, async (error, pdfBuffer) => {
      if (error) {
        // Handle error
        return res.status(500).json({ message: "Error generating PDF" });
      }

      // Send initial response (e.g., processing started)
      res.status(202).json({ message: "E-ticket will sent to your email!" });

      await prisma.notifications.create({
        data: {
          title: "Your e-ticket has been sent",
          description: "Please check your email to find the e-ticket",
          user_id: req.user.user_id,
          status: "unread",
        },
      });
      // Handle PDF buffer asynchronously (e.g., save to disk)
      await sendTicket(req.user.email, pdfBuffer, fileName);
      console.log("Success");
    });
  } catch (err) {
    next(err);
  }
};

const cancelTransactions = async (req, res, next) => {
  try {
    const code = req.params.code;
    const user_id = req.user.user_id;

    const isDataExist = await prisma.transactions.findUnique({
      where: { booking_code: code },
    });

    if (!isDataExist) {
      return res.status(400).json({
        status: false,
        message: "Data transaksi tidak ditemukan",
        data: null,
      });
    }

    if (+isDataExist.user_id !== +user_id) {
      return res.status(400).json({
        status: false,
        message: "Data transaksi ini bukan milik anda!",
        data: null,
      });
    }

    const result = await prisma.$transaction(async (prisma) => {
      const updated = await prisma.transactions.update({
        where: { booking_code: code },
        data: {
          status: transaction_status.CANCELLED,
        },
      });

      if (!updated) {
        return false;
      }

      await prisma.notifications.create({
        data: {
          title: "Transaksi berhasil dibatalkan!",
          description: `Anda berhasil membatalkan transaksi [${updated.booking_code}], Sampai jumpa lagi!`,
          user_id: req.user.user_id,
          status: "unread",
        },
      });

      return true;
    });

    if (!result) {
      return res.status(400).json({
        status: false,
        message: "Data transaksi gagal untuk dibatalkan!",
        data: null,
      });
    }

    res.status(200).json({
      status: false,
      message: "Data transaksi berhasil dibatalkan!",
      data: null,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { history, processPayment, printTicket, cancelTransactions };
