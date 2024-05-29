const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

getNotifications = async (req, res) => {
  const userId = parseInt(req.params.userId);

  try {
    const notifications = await prisma.notifications.findMany({
      where: {
        user_id: userId,
      },
      select: {
        title: true,
        description: true,
        created_at: true,
        status: true,
      },
    });

    const formattedNotifications = notifications.map((notification) => ({
      title: notification.title,
      description: notification.description,
      date: notification.created_at.toISOString().split("T")[0], // YYYY-MM-DD
      status: notification.status,
      time: notification.created_at.toTimeString().split(" ")[0], // HH:MM:SS
    }));

    res.status(200).json(formattedNotifications);
  } catch (error) {
    res.status(500).json({ message: "Error fetching notifications", error });
  }
};


module.exports = { getNotifications };
