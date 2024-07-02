const fs = require("fs");
const { PrismaClient, transaction_status } = require("@prisma/client");
const prisma = new PrismaClient();
const path = require("path");

const SCHEDULE_FILE_NAME = "schedules.json";
const SCHEDULE_FILE_PATH = path.join(
  __dirname,
  "../prisma/data",
  SCHEDULE_FILE_NAME,
);

//functions
const addDays = (date, days) => {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);

  return `${newDate.toISOString().split("T")[0]}T00:00:00Z`;
};

const updateFlightDates = (flights, daysToAdd) => {
  return flights.map((flight) => ({
    ...flight,
    flight_date: addDays(flight.flight_date, daysToAdd),
  }));
};

const getLatestDate = async () => {
  const lastUpdate = await prisma.lastUpdate.findFirst({
    orderBy: {
      last_update: "desc",
    },
  });

  return lastUpdate ? new Date(lastUpdate.last_update) : null;
};

const saveLatestDate = async (date) => {
  await prisma.lastUpdate.create({
    data: {
      last_update: date,
    },
  });
};

//main functions
const updateFlights = async () => {
  try {
    const data = fs.readFileSync(SCHEDULE_FILE_PATH, "utf-8");
    const schedules = JSON.parse(data);

    //get latest update
    const latestDate = await getLatestDate();
    const currentDate = new Date();

    //calculate weeks
    const weeksToAdd = latestDate
      ? Math.floor((currentDate - latestDate) / (1000 * 60 * 60 * 24 * 7))
      : 0;

    if (weeksToAdd > 0) {
      //update date
      const updatedSchedules = updateFlightDates(schedules, 14 * weeksToAdd);

      await prisma.flights.createMany({
        data: updatedSchedules,
      });

      console.log("Data penerbangan berhasil diperbarui");

      fs.writeFileSync(
        SCHEDULE_FILE_PATH,
        JSON.stringify(updatedSchedules, null, 2),
        "utf-8",
      );
      console.log("File schedules berhasil diperbarui");

      await saveLatestDate(currentDate);
    } else {
      console.log("Data sudah yang terkini");
    }
  } catch (err) {
    console.log("Error saat memperbaharui data:", err);
  }
};

const cancelTransaction = async () => {
  const targetDate = new Date(); // The target date without the time component
  targetDate.setHours(0, 0, 0, 0); // Set time to the start of the day

  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1); // Move to the next day

  const existedTransactions = await prisma.transactions.findMany({
    where: {
      expired_at: {
        gte: targetDate,
        lt: nextDay,
      },
    },
  });

  existedTransactions.forEach(async (t) => {
    if (t.status === transaction_status.BELUM_DIBAYAR) {
      await prisma.transactions.update({
        where: { transaction_id: t.transaction_id },
        data: { status: transaction_status.BATAL },
      });

      console.log(`Transaction [${t.booking_code}] expired`);
    }
  });
};

module.exports = { updateFlights, addDays, cancelTransaction };
