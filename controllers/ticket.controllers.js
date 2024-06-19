const { PrismaClient, Prisma, transaction_status } = require("@prisma/client");
const prisma = new PrismaClient();

function generateCode(length = 8) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters[randomIndex];
  }
  return result;
}

async function generateBookingCode() {
  let code;
  let isUnique = false;

  while (!isUnique) {
    code = generateCode();
    const isExist = await prisma.transactions.findUnique({
      where: { booking_code: code },
    });

    if (!isExist) {
      isUnique = true;
    }
  }

  return code.toString();
}

async function calculateTotalPrice(
  flights,
  total_adult,
  total_children,
  total_baby,
) {
  const prices = await prisma.flights.findMany({
    where: { flight_id: { in: flights } },
    select: { price: true },
  });
  let price = prices.reduce((sum, flight) => sum + flight.price, 0);
  let babyPrice = (price * 0.1)*total_baby

  price *= total_adult + total_children;
  price += babyPrice

  const tax = price * 0.1;
  price += tax;
  return { price, tax };
}

module.exports = {
  createTicket: async (req, res, next) => {
    try {
      let {
        flights,
        total_adult,
        total_children,
        total_baby,
        orderer,
        passengers,
      } = req.body;

      if (
        !flights | !flights.length ||
        total_adult < 1 ||
        total_children < 0 ||
        total_baby < 0 ||
        !Object.keys(orderer).length ||
        !passengers.length
      ) {
        res.status(400).json({
          status: false,
          message: "Semua kolom harus diisi",
          data: null,
        });
      }

      const { price, tax } = await calculateTotalPrice(
        flights,
        total_adult,
        total_children,
        total_baby,
      );

      const departure_flight = flights[0];
      const arrival_flight = flights[1] || null;

      const result = await prisma.$transaction(async (prisma) => {
        const ordererDb = await prisma.users.update({
          data: {
            orderer: {
              upsert: {
                create: { ...orderer },
                update: { ...orderer },
              },
            },
          },
          where: { user_id: req.user.user_id },
          include: {
            orderer: {
              select: { orderer_id: true },
            },
          },
        });

        if (!ordererDb) {
          throw new Error("Orderer is failed to create/update");
        }

        passengers = passengers.map((p) => ({
          ...p,
          orderer_id: ordererDb.orderer.orderer_id,
          date_of_birth: new Date(p.date_of_birth),
          valid_until: new Date(p.valid_until),
        }));

        const ticket = await prisma.tickets.create({
          data: {
            total_adult,
            total_baby,
            total_children,
            departure_flight_id: departure_flight,
            arrival_flight_id: arrival_flight,
            transaction: {
              create: {
                total_price: price,
                status: transaction_status.UNPAID,
                booking_code: await generateBookingCode(),
                tax: tax,
                user: {
                  connect: { user_id: req.user.user_id },
                },
              },
            },
            passengers: {
              createMany: {
                data: passengers,
              },
            },
          },
          include: {
            transaction: true,
          },
        });

        if (!ticket) {
          throw new Error("Ticket fail to create");
        }

        await prisma.notifications.create({
          data: {
            title: "Tiket Berhasil Dibuat",
            description: `Pemesanan tiket Anda telah berhasil. Silakan lakukan pembayaran pada Kode Booking [${ticket.transaction.booking_code}] untuk menyelesaikan proses pembayaran`,
            user_id: req.user.user_id,
            status: "Belum dibaca",
          },
        });

        return {
          ticket_id: ticket.ticket_id,
          transaction_id: ticket.transaction.transaction_id,
        };
      });

      const data = await prisma.transactions.findUnique({
        where: { transaction_id: result.transaction_id },
        select: {
          booking_code: true,
          total_price: true,
          tax: true,
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
      });

      const returnData = {
        booking_code: data.booking_code,
        total_price: data.total_price,
        tax: data.tax,
        total_before_tax: +data.total_price - +data.tax,
        default_departure_price: data.ticket.departure_flight.price,
        default_departure_baby_price: +data.ticket.departure_flight.price*0.1,
        total_adult: data.ticket.total_adult,
        total_children: data.ticket.total_children,
        total_baby: data.ticket.total_baby,
        departure: {
          flight_date: data.ticket.departure_flight.flight_date.split("T")[0],
          departure_time: data.ticket.departure_flight.departure_time,
          arrival_time: data.ticket.departure_flight.arrival_time,
          departure_terminal: data.ticket.departure_flight.departure_terminal,
          arrival_terminal: data.ticket.departure_flight.arrival_terminal,
          departure_airport:
            data.ticket.departure_flight.departure_airport.name,
          arrival_airport: data.ticket.departure_flight.arrival_airport.name,
          departure_code: data.ticket.departure_flight.departure_airport.code,
          arrival_code: data.ticket.departure_flight.arrival_airport.code,
          departure_city: data.ticket.departure_flight.departure_airport.city,
          arrival_city: data.ticket.departure_flight.arrival_airport.city,
          airline: data.ticket.departure_flight.airplane.airline.name,
          class: data.ticket.departure_flight.class,
        },
      };

      if (!data.ticket.arrival_flight) {
        returnData.return = null;
      } else {
        returnData.default_return_baby_price = data.ticket.arrival_flight.price*0.1,
        returnData.default_return_price= data.ticket.arrival_flight.price,
        returnData.return = {
          flight_date: data.ticket.arrival_flight.flight_date.split("T")[0],
          departure_time: data.ticket.arrival_flight.departure_time,
          arrival_time: data.ticket.arrival_flight.arrival_time,
          departure_terminal: data.ticket.arrival_flight.departure_terminal,
          arrival_terminal: data.ticket.arrival_flight.arrival_terminal,
          departure_airport: data.ticket.arrival_flight.departure_airport.name,
          arrival_airport: data.ticket.arrival_flight.arrival_airport.name,
          departure_code: data.ticket.arrival_flight.departure_airport.code,
          arrival_code: data.ticket.arrival_flight.arrival_airport.code,
          departure_city: data.ticket.arrival_flight.departure_airport.city,
          arrival_city: data.ticket.arrival_flight.arrival_airport.city,
          airline: data.ticket.arrival_flight.airplane.airline.name,
          class: data.ticket.arrival_flight.class,
        };
      }

      res.status(200).json({
        status: true,
        message: "Tiket Berhasil Dibuat",
        data: returnData,
      });
    } catch (err) {
      if (
        err.message === "Gagal membuat/memperbarui pesanan" ||
        err.message === "Gagal membuat tiket"
      ) {
        return res.status(400).json({
          status: false,
          message: err.message,
          data: null,
        });
      }

      next(err);
    }
  },
};
