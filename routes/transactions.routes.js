const Router = require("express").Router();
const {
  history,
  processPayment,
  printTicket,
} = require("../controllers/transaction.controller");
const { verifyToken } = require("../libs/middleware");

Router.post("/pay", verifyToken, processPayment);
Router.get("/history", verifyToken, history);
Router.get("/:code", verifyToken, printTicket);

//
module.exports = Router;
