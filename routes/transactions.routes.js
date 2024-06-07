const Router = require("express").Router();
const { history, processPayment } = require("../controllers/transaction.controller");
const { verifyToken } = require("../libs/middleware");


Router.post("/pay", verifyToken, processPayment);
Router.get("/history", verifyToken, history);

//
module.exports = Router;
