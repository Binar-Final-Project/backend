const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getTicketDetails = async (req, res) => {
  const { ticketId } = req.params;

  try {
    const ticket = await prisma.tickets.findUnique({
      where: {
        ticket_id: parseInt(ticketId),
      },
      include: {
        flight: {
          include: {
            airplane: {
              include: {
                airline: true,
              },
            },
            departure_airport: true,
            arrival_airport: true,
          },
        },
        passengers: true,
        transaction: true,
      },
    });

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const response = {
      flight_number: ticket.flight.flight_number,
      flight_date: ticket.flight.flight_date,
      departure_time: ticket.flight.departure_time,
      arrival_time: ticket.flight.arrival_time,
      departure_terminal: ticket.flight.departure_terminal,
      arrival_terminal: ticket.flight.arrival_terminal,
      class: ticket.flight.class,
      price: ticket.flight.price,
      duration: ticket.flight.duration,
      free_baggage: ticket.flight.free_baggage,
      cabin_baggage: ticket.flight.cabin_baggage,
      entertainment: ticket.flight.entertainment,
      airline: {
        name: ticket.flight.airplane.airline.name,
        short_name: ticket.flight.airplane.airline.short_name,
        iconUrl: ticket.flight.airplane.airline.iconUrl,
      },
      departure_airport: ticket.flight.departure_airport,
      arrival_airport: ticket.flight.arrival_airport,
      passengers: ticket.passengers,
      transaction: ticket.transaction,
    };

    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
    getTicketDetails,
  };
