const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const history = async (req, res) => {
    try {
        const condition = {
            where: {
                user_id: req.user.user_id
            },
            orderBy: {
                ticket: {
                    departure_flight: {
                        flight_date: 'desc'
                    }
                }
            },
            include: {
                ticket: {
                    include: {
                        departure_flight : {
                            include : {
                                departure_airport : true,
                                arrival_airport : true,
                                airplane : {
                                    include: {
                                        airline: true
                                    }
                                }
                            }
                        },
                        arrival_flight : {
                            include : {
                                departure_airport : true,
                                arrival_airport : true,
                                airplane : {
                                    include: {
                                        airline: true
                                    }
                                }
                            }
                        },
                        passengers : true
                    }
                }
            }
        };

        if(req.query.q) {
            condition.where = {
                ...condition.where,
                booking_code : {
                    // case-insensitive search
                    contains: req.query.q,
                    mode: 'insensitive'
                }
            };
        };

        if(req.query.lt && req.query.gte) {
            condition.where = {
                AND: [
                    condition.where,
                    {
                        ticket: {
                            departure_flight :{
                                flight_date: {
                                    lte: req.query.lt
                                }
                            }
                        }
                    },
                    {
                        ticket: {
                            departure_flight :{
                                flight_date: {
                                    gte: req.query.gte
                                }
                            }
                        }
                    },
                ]
            }

        }

        const transactions = await prisma.transactions.findMany(condition);
        
        transactions.map(transaction => {
            transaction.total_adult = transaction.ticket.total_adult;
            transaction.total_children = transaction.ticket.total_children;
            transaction.total_baby = transaction.ticket.total_baby;
            transaction.passengers = transaction.ticket.passengers;
            
            // departure_flight
            transaction.departure_flight = transaction.ticket.departure_flight;
            transaction.departure_flight.departure_airport = transaction.ticket.departure_flight.departure_airport.name;
            transaction.departure_flight.arrival_airport = transaction.ticket.departure_flight.arrival_airport.name;
            transaction.departure_flight.airplane_model = transaction.ticket.departure_flight.airplane.model;
            transaction.departure_flight.airline = transaction.ticket.departure_flight.airplane.airline.name;
            delete transaction.departure_flight.airplane;

            // arrival_flight
            transaction.arrival_flight = transaction.ticket.arrival_flight;
            transaction.arrival_flight.departure_airport = transaction.ticket.arrival_flight.departure_airport.name;
            transaction.arrival_flight.arrival_airport = transaction.ticket.arrival_flight.arrival_airport.name;
            transaction.arrival_flight.airplane_model = transaction.ticket.arrival_flight.airplane.model;
            transaction.arrival_flight.airline = transaction.ticket.arrival_flight.airplane.airline.name;
            delete transaction.arrival_flight.airplane;

            delete transaction.ticket;
            return transaction;
        });

        res.status(200).json({
            status: true,
            message: "OK",
            data: transactions
        });
    } catch (error) {
        console.log (error);
        res.status(500).json({ message: 'Something went wrong' });
    }
}

module.exports = { history}