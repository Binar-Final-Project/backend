const { search } = require('../controllers/flight.controllers')
const Router = require('express').Router()

Router.post('/', search)

module.exports = Router