const fs = require("fs");
const scheduleRaw = require("./schedules.json");
const scheduleFinal = require("./scheduleBased.json");

const convertTimestampToTime = (timestamp) => {
  const hours = Math.floor(timestamp / 3600);
  const minutes = Math.floor((timestamp % 3600) / 60);
  const formattedHours = String(hours).padStart(2, "0");
  const formattedMinutes = String(minutes).padStart(2, "0");
  return `${formattedHours}:${formattedMinutes}`;
};

function getRandomCapacity() {
  const min = 70;
  const max = 110;
  const step = 5;

  // Buat array yang berisi semua nilai dari min ke max dengan kelipatan step
  const capacities = [];
  for (let i = min; i <= max; i += step) {
    capacities.push(i);
  }

  // Pilih nilai acak dari array capacities
  const randomIndex = Math.floor(Math.random() * capacities.length);
  return capacities[randomIndex];
}

function getTimeInMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
  

function getFlightDuration(departureTime, arrivalTime) {
  const departureInMinutes = getTimeInMinutes(departureTime);
  const arrivalInMinutes = getTimeInMinutes(arrivalTime);

  // Jika arrival time lebih kecil dari departure time, berarti penerbangan melewati tengah malam
  if (arrivalInMinutes < departureInMinutes) {
    return 24 * 60 - departureInMinutes + arrivalInMinutes;
  }

  return arrivalInMinutes - departureInMinutes;
}

const main = async function () {
  const updated = scheduleFinal.map((finalS) => {
    const raw = scheduleRaw.find(
      (raw) => raw.flight_number === finalS.flight_number,
    );

    if (raw) {
      return {
        ...finalS,
        flight_date: `${finalS.flight_date}T00:00:00Z`,
        departure_time: convertTimestampToTime(raw.departure_base_timestamp),
        arrival_time: convertTimestampToTime(raw.arrival_base_timestamp),
        price: raw.price,
        capacity: getRandomCapacity(),
        duration: getFlightDuration(convertTimestampToTime(raw.departure_base_timestamp), convertTimestampToTime(raw.arrival_base_timestamp))
      };
    }
  });

  console.log(updated[0])

//   fs.writeFile('prisma/data/scheduleBased.json', JSON.stringify(updated), (err) => {
//       if(err) console.log(err)

//       console.log('ss')
//   })
};

main();
