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
        include: {
          ticket: {
            include: {
              departure_flight: true,
              arrival_flight: true,
              passengers: true,
            },
          },
          user: true,
        },
      });
  
      if (transactions.length === 0) {
        return res.status(400).json({
          status: false,
          message: "Data not found",
          data: null,
        });
      }
  
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