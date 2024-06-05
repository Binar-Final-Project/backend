const express = require('express');
const router = express.Router();
const transactionController = require("../controllers/transaction.controllers");

router.get('/', transactionController.getAllTransactions);
router.post('/pay', transactionController.processPayment);

module.exports = router;
