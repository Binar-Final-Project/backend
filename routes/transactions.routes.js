const Router = require("express").Router();
const {
  history,
  printTicket,
} = require("../controllers/transaction.controller");
const { verifyToken } = require("../libs/middleware");

Router.get("/history", verifyToken, history);
Router.get("/:code", verifyToken, printTicket);

module.exports = Router;
