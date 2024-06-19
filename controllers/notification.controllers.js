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
      orderBy: {created_at: 'desc'}
    });

    if (notifications.length === 0) {
      return res.status(400).json({
        status: false,
        message: "Data tidak ditemukan",
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
      message: "Terjadi Kesalahan pada Internal Server",
      data: null,
    });
    next(error);
  }
};

updateNotification = async (req,res,next) => {
  try {
    const notif_id = +req.params.id

    const isRead = await prisma.notifications.findUnique({where: {notification_id: notif_id}})

    if(isRead.status === 'read'){
      return res.status(200).json({
        status: true,
        message: 'Notifikasi sudah dibaca'
      })
    }

    const result = await prisma.notifications.update({
      where: {notification_id: notif_id},
      data: {
        status: 'read'
      }
    })

    if(!result) {
      return res.status(400).json({
        status: false,
        message: 'Notifikasi tidak ditemukan',
        data: null
      })
    }

    res.status(200).json({
      status: true,
      message: 'Berhasil diperbarui',
      data: {notification_status: result.status}
    })
  } catch (err) {
    next(err)
  }
}

markAll = async (req,res,next) => {
  try {
    const user_id = req.user.user_id

    const notifications = await prisma.notifications.findMany({
      where: {user_id}
    })

    if(!notifications){
      return res.status(400).json({
        status: true,
        message: 'Notifikasi tidak ditemukan',
        data: null
      })
    }

    notifications.forEach(async notification => {
      if(notification.status === 'unread'){
        await prisma.notifications.update({
          where: {notification_id: notification.notification_id},
          data: {status: 'read'}
        })
      }
    })

    res.status(200).json({
      status: true,
      message: 'Semua notifikasi sudah dibaca',
      data: null
    })
  } catch (err) {
    next(err)
  }
}

module.exports = { getNotification, updateNotification, markAll };