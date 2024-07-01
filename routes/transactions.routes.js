const Router = require("express").Router();
const {
  history,
  processPayment,
  printTicket,
  cancelTransactions,
} = require("../controllers/transaction.controller");
const { verifyToken } = require("../libs/middleware");

Router.post("/pay", verifyToken, processPayment);
Router.get("/history", verifyToken, history);
Router.get("/:code", verifyToken, printTicket);
Router.put("/:code", verifyToken, cancelTransactions)
//
module.exports = Router;
