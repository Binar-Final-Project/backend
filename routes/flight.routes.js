const { search, getCheapestFlights } = require('../controllers/flight.controllers')
const Router = require('express').Router()

Router.post('/', search)
Router.get('/cheapest', getCheapestFlights)

module.exports = Router