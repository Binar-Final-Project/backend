const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

getNotificationById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const notifications = await prisma.notifications.findMany({
      where: { user_id: parseInt(id) },
    });

    if (notifications.length === 0) {
      return res.status(400).json({
        status: false,
        message: "Data not found",
        data: null,
      });
    }

    const formattedNotifications = notifications.map((notification) => ({
      ...notification,
      created_at: new Date(notification.created_at).toLocaleString("en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "Asia/Jakarta",
      }),
    }));

    res.status(200).json({
      status: true,
      message: "OK",
      data: formattedNotifications,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Internal Server Error",
      data: null,
    });
    next(error);
  }
};

module.exports = { getNotificationById };