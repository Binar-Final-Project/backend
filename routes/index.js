const Router = require("express").Router();
const swaggerUi = require("swagger-ui-express");
const docs = require("../docs/v4.json");

// Example routes
// const ticketRoutes = require('./ticket.routes')
// Router.use('/tickets', ticketRoutes)

const authRouter = require("./auth.routes");
Router.use("/users", authRouter);
const flightRouter = require("./flight.routes");
Router.use("/flights", flightRouter);
const ticketRouter = require("./ticket.routes");
Router.use("/tickets", ticketRouter);
const notificationsRouter = require("./notification.routes");
Router.use("/notifications", notificationsRouter);
const transactionsRouter = require("./transaction.routes");
Router.use("/transactions", transactionsRouter);

Router.get("/", (req, res) => {
  res.status(200).json({
    status: true,
    message: "Connected to Server!",
  });
});

Router.use("/docs", swaggerUi.serve, swaggerUi.setup(docs));

module.exports = Router;
