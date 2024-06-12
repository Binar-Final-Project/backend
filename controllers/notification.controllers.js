const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

getNotification = async (req, res, next) => {
  const id = req.user.user_id;
  const { status } = req.query; 

  try {
    const whereClause = { user_id: parseInt(id) };
    if (status) {
      whereClause.status = status; 
    }

    const notifications = await prisma.notifications.findMany({
      where: whereClause,
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

updateNotification = async (req,res,next) => {
  try {
    const notif_id = +req.params.id

    const result = await prisma.notifications.update({
      where: {notification_id: notif_id},
      data: {
        status: 'read'
      }
    })

    if(!result) {
      return res.status(400).json({
        status: false,
        message: 'Notification not found',
        data: null
      })
    }

    res.status(200).json({
      status: true,
      message: 'Updated!',
      data: {notification_status: result.status}
    })
  } catch (err) {
    next(err)
  }
}

module.exports = { getNotification, updateNotification };