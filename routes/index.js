const Router = require('express').Router()

// Example routes
// const ticketRoutes = require('./ticket.routes')
// Router.use('/tickets', ticketRoutes)

Router.get('/', (req,res) => {
    res.status(200).json({
        status: true,
        message: 'Connected to Server!'
    })
})

module.exports = Router