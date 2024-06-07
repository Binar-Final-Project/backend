const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

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

module.exports = { processPayment };
