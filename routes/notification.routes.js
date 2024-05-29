const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controllers');

router.get('/:userId', notificationController.getNotifications);

module.exports = router;
