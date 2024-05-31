const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controllers');

router.get('/notifications/:id', notificationController.getNotificationById);

module.exports = router;