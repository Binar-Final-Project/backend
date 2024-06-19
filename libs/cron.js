const fs = require('fs')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const path = require('path')

const SCHEDULE_FILE_NAME = 'schedules.json'
const SCHEDULE_FILE_PATH = path.join(__dirname, '../prisma/data', SCHEDULE_FILE_NAME)

//functions
const addDays = (date, days) => {
    const newDate = new Date(date)
    newDate.setDate(newDate.getDate() + days)

    return `${newDate.toISOString().split('T')[0]}T00:00:00Z`
}

const updateFlightDates = (flights, daysToAdd) => {
    return flights.map(flight => ({
        ...flight,
        flight_date: addDays(flight.flight_date, daysToAdd)
    }))
}

const getLatestDate = async () => {
    const lastUpdate = await prisma.lastUpdate.findFirst({
        orderBy: {
            last_update: 'desc'
        }
    })

    return lastUpdate ? new Date(lastUpdate.last_update) : null
}

const saveLatestDate = async (date) => {
    await prisma.lastUpdate.create({
        data: {
            last_update: date
        }
    })
}

//main functions
const updateFlights = async () => {
    try {
        const data = fs.readFileSync(SCHEDULE_FILE_PATH, 'utf-8')
        const schedules = JSON.parse(data)

        //get latest update
        const latestDate = await getLatestDate()
        const currentDate = new Date()

        //calculate weeks
        const weeksToAdd = latestDate ? Math.floor((currentDate - latestDate) / (1000 * 60 * 60 * 24 * 7)) : 0

        if (weeksToAdd > 0){
            //update date
            const updatedSchedules = updateFlightDates(schedules, 14 * weeksToAdd)

            await prisma.flights.createMany({
                data: updatedSchedules
            })

            console.log('Data penerbangan berhasil diperbarui')

            fs.writeFileSync(SCHEDULE_FILE_PATH, JSON.stringify(updatedSchedules, null, 2), 'utf-8')
            console.log('File schedules berhasil diperbarui')

            await saveLatestDate(currentDate)
        } else {
            console.log('Data sudah yang terkini')
        }
    } catch (err) {
        console.log('Error saat memperbaharui data:', err)
    }
}

module.exports = {updateFlights}