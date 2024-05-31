require("dotenv").config();
const express = require("express");
const app = express();
app.use(express.json());
const morgan = require("morgan");
const cors = require("cors");

app.set("view engine", "ejs");

app.use(
  cors({
    origin: "http://localhost:5173",
    optionsSuccessStatus: 200,
  })
);
app.use(morgan("dev"));

const routes = require("./routes/index");
const notificationsRoute = require("./routes/notification.routes");

app.use("/api/v1", routes);
app.use("/api/v1", notificationsRoute);

const { PORT } = process.env || 3000;
app.listen(PORT, () => console.log("Server is listening on port", PORT));
