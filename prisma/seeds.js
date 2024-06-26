const {PrismaClient} = require('@prisma/client')
const prisma = new PrismaClient()
const airlinesRaw = require('./data/airlines.json')
const airplanesRaw = require('./data/airplanes.json')
const airportsRaw = require('./data/airports.json')

async function seedAirlines(){
    const airlines = airlinesRaw.map(airline => {
        return {
            name: airline.name,
            short_name: airline.short_name,
            iconUrl: airline.icon_url
        }
    })
    
    await prisma.airlines.createMany({
        data: airlines,
        skipDuplicates: true
    })
}

async function seedAirplanes(){
    const airlineDict = {
        ID: "Batik Air",
        QG: "Citilink",
        GA: "Garuda Indonesia",
        JT: "Lion Air",
        NM: "NAM Air",
        SJ: "Sriwijaya Air",
        '8B': 'TransNusa',
        IL: "Trigana Air",
        IW: "Wings Air"
    }
    
    const airplaneFirstTransform = airplanesRaw.map(airplane => {
        return {
            model: airplane.model,
            airline: airlineDict[airplane.airline_code]
        }
    })

    const airlinesDB = await prisma.airlines.findMany()
    const airlineId = {}
    airlinesDB.forEach(airline => {
        airlineId[airline.name] = airline.airline_id
    })

    const airplaneFinal = airplaneFirstTransform.map(airplane => ({
        model: airplane.model,
        airline_id: airlineId[airplane.airline]
    }))

    await prisma.airplanes.createMany({
        data: airplaneFinal,
        skipDuplicates: true
    })
}

async function seedAirports(){
    const airports = airportsRaw.map(airport => ({
        name: airport.name,
        city: airport.city,
        country: airport.country,
        code: airport.iata_code
    }))

    await prisma.airports.createMany({
        data: airports,
        skipDuplicates: true
    })
}

const schedule = require('./data/schedules.json')
const { addDays } = require('../libs/cron')
async function seedSchedules(){

    
    const currentDate = new Date()
    const oldestDate = new Date(schedule[0].flight_date)
    console.log(schedule.length)

    const gapDays = Math.floor((currentDate - oldestDate) / (1000 * 60 * 60 * 24))

    let mappedSchedule = schedule.map(s => {
        return {
            ...s,
            flight_date: addDays(s.flight_date, gapDays)
        }
    })
    await prisma.flights.createMany({
        data: mappedSchedule
    })

    await prisma.lastUpdate.create({
        data: {
            last_update: new Date()
        }
    })
}

async function main(){
    try {
        await seedAirlines()

        await seedAirplanes()

        await seedAirports()

        await seedSchedules()
    } catch (err) {
        throw err
    }
}

main().catch((e) => console.log("error while seeding:", e))