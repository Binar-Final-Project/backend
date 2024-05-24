const Router = require('express').Router()
const swaggerUi = require('swagger-ui-express')
const docs = require('../docs/v1.json')

// Example routes
// const ticketRoutes = require('./ticket.routes')
// Router.use('/tickets', ticketRoutes)

Router.get('/', (req,res) => {
    res.status(200).json({
        status: true,
        message: 'Connected to Server!'
    })
})

Router.use('/docs', swaggerUi.serve, swaggerUi.setup(docs))

module.exports = Router