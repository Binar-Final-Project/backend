const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controllers');
const { verifyToken } = require('../libs/middleware');

router.get('/', verifyToken ,notificationController.getNotification);
router.get('/mark-all', verifyToken, notificationController.markAll)
router.put('/:id', verifyToken, notificationController.updateNotification)

module.exports = router;