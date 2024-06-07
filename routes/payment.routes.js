const express = require('express');
const router = express.Router();
const transactionController = require("../controllers/payment.controllers");

router.post('/', transactionController.processPayment);

module.exports = router;
