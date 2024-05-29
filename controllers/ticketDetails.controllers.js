const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getAllTickets = async (req, res) => {
  try {
    const tickets = await prisma.tickets.findMany({
      include: {
        flight: {
          include: {
            departure_airport: true,
            arrival_airport: true,
            airplane: {
              include: {
                airline: true,
              },
            },
          },
        },
        passengers: true,
        transaction: {
          include: {
            user: true,
          },
        },
      },
    });

    const ticketDetails = tickets.map(ticket => ({
      airline_name: ticket.flight.airplane.airline.name,
      flight_class: ticket.flight.class,
      departure_time: ticket.flight.departure_time,
      arrival_time: ticket.flight.arrival_time,
      departure_airport_city: ticket.flight.departure_airport.city,
      arrival_airport_city: ticket.flight.arrival_airport.city,
      duration: ticket.flight.duration,
      price: ticket.flight.price,
      departure_time: ticket.flight.departure_time,
      flight_date: ticket.flight.flight_date,
      departure_airport_name: ticket.flight.departure_airport.name,
      departure_terminal: ticket.flight.departure_terminal,
      airplane_model: ticket.flight.airplane.model,
      free_baggage: ticket.flight.free_baggage,
      cabin_baggage: ticket.flight.cabin_baggage,
      entertainment: ticket.flight.entertainment,
      arrival_time: ticket.flight.arrival_time,
      arrival_airport_name: ticket.flight.arrival_airport.name,
      arrival_terminal: ticket.flight.arrival_terminal
    }));

    res.json(ticketDetails);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getTicketById = async (req, res) => {
  const { ticket_id } = req.params;

  try {
    const ticket = await prisma.tickets.findUnique({
      where: { ticket_id: parseInt(ticket_id) },
      include: {
        flight: {
          include: {
            departure_airport: true,
            arrival_airport: true,
            airplane: {
              include: {
                airline: true,
              },
            },
          },
        },
        passengers: true,
        transaction: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticketDetail = {
      airline_name: ticket.flight.airplane.airline.name,
      flight_class: ticket.flight.class,
      departure_time: ticket.flight.departure_time,
      arrival_time: ticket.flight.arrival_time,
      departure_airport_city: ticket.flight.departure_airport.city,
      arrival_airport_city: ticket.flight.arrival_airport.city,
      duration: ticket.flight.duration,
      price: ticket.flight.price,
      departure_time: ticket.flight.departure_time,
      flight_date: ticket.flight.flight_date,
      departure_airport_name: ticket.flight.departure_airport.name,
      departure_terminal: ticket.flight.departure_terminal,
      airplane_model: ticket.flight.airplane.model,
      free_baggage: ticket.flight.free_baggage,
      cabin_baggage: ticket.flight.cabin_baggage,
      entertainment: ticket.flight.entertainment,
      arrival_time: ticket.flight.arrival_time,
      arrival_airport_name: ticket.flight.arrival_airport.name,
      arrival_terminal: ticket.flight.arrival_terminal
    };

    res.json(ticketDetail);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAllTickets,
  getTicketById,
};
