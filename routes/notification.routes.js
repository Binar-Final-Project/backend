const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controllers');
const { verifyToken } = require('../libs/middleware');

router.get('/', verifyToken ,notificationController.getNotification);

module.exports = router;