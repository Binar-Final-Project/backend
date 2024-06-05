const { PrismaClient, Prisma, transaction_status } = require("@prisma/client");
const prisma = new PrismaClient();

function generateCode(length = 8){
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters[randomIndex];
    }
    return result;
}

async function generateBookingCode(){
    let code;
    let isUnique = false

    while(!isUnique){
        code = generateCode()
        const isExist = await prisma.transactions.findUnique({
            where: {booking_code: code}
        })

        if(!isExist){
            isUnique = true
        }
    }
    
    return code.toString()
}

async function calculateTotalPrice(flights, total_adult, total_children, total_baby){
    const prices = await prisma.flights.findMany({
        where: {flight_id: {in: flights}},
        select: {price: true}
    })

    let price = prices.reduce((sum, flight) => sum + flight.price, 0)

    price *= (total_adult+total_children+total_baby)
    
    const tax = price * 0.1
    price += tax
    return {price, tax}
}

module.exports = {
    createTicket: async (req,res,next) => {
        try {
            let {flights, total_adult, total_children, total_baby, orderer, passengers} = req.body

            if(!flights.length || total_adult<1 || total_children<0 || total_baby<0 || !Object.keys(orderer).length || !passengers.length){
                res.status(400).json({
                    status: false,
                    message: 'All fields are required!',
                    data: null
                })
            }

            const {price, tax} = await calculateTotalPrice(flights, total_adult, total_children, total_baby)

            const departure_flight = flights[0]
            const arrival_flight = flights[1] || null

            const result = await prisma.$transaction(async (prisma) => {
                const ordererDb = await prisma.users.update({
                    data: {
                        orderer: {
                            upsert: {
                                create: { ...orderer },
                                update: { ...orderer }
                            }
                        }
                    },
                    where: { user_id: req.user.user_id },
                    include: {
                        orderer: {
                            select: { orderer_id: true }
                        }
                    }
                });
        
                if (!ordererDb) {
                    throw new Error('Orderer is failed to create/update');
                }
        
                passengers = passengers.map(p => ({
                    ...p,
                    orderer_id: ordererDb.orderer.orderer_id,
                    date_of_birth: new Date(p.date_of_birth),
                    valid_until: new Date(p.valid_until)
                }));
        
                const ticket = await prisma.tickets.create({
                    data: {
                        total_adult,
                        total_baby,
                        total_children,
                        departure_flight_id: departure_flight,
                        arrival_flight_id: arrival_flight,
                        transaction: {
                            create: {
                                total_price: price,
                                status: transaction_status.ISSUED,
                                booking_code: await generateBookingCode(),
                                tax: tax,
                                user: {
                                    connect: { user_id: req.user.user_id }
                                }
                            }
                        },
                        passengers: {
                            createMany: {
                                data: passengers,
                            }
                        }
                    },
                    include: {
                        transaction: true
                    }
                });
        
                if (!ticket) {
                    throw new Error('Ticket fail to create');
                }
        
                return {
                    ticket_id: ticket.ticket_id,
                    transaction_id: ticket.transaction.transaction_id
                };
            });
        
            res.status(200).json({
                status: true,
                message: 'Ticket Successfully Created',
                data: result
            });
        } catch (err) {
            if (err.message === 'Orderer is failed to create/update' || err.message === 'Ticket fail to create') {
                return res.status(400).json({
                    status: false,
                    message: err.message,
                    data: null
                });
            }
            
            next(err)
        }
    }
}