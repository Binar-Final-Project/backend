const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

getNotificationById = async (req, res) => {
  const { id } = req.params;
  try {
    const notifications = await prisma.notifications.findMany({
      where: { user_id: parseInt(id) },
    });

    res.json({
      status: true,
      message: "OK",
      data: notifications,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error retrieving notifications",
      error: error.message,
    });
  }
};

module.exports = { getNotificationById };