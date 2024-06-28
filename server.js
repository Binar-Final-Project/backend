require("dotenv").config();
const express = require("express");
const app = express();
app.use(express.json());
const morgan = require("morgan");
const cors = require("cors");
const cron = require('node-cron')

app.set("view engine", "ejs");

app.use(
  cors({
    origin: ["http://localhost:5173", "https://biflight.vercel.app"],
    optionsSuccessStatus: 200,
  })
);
app.use(morgan("dev"));

const routes = require("./routes/index");

app.use("/api/v1", routes);

//cron
const {updateFlights} = require('./libs/cron')
cron.schedule('0 0 * * 0', async () => {
  console.log('Cronjob akan memperbarui data')
  await updateFlights()
  console.log('Cronjob sudah selesai')
})

const { PORT } = process.env || 8080;
app.listen(PORT, () => console.log("Server is listening on port", PORT));
