const { search } = require('../controllers/flight.controllers')
const Router = require('express').Router()

Router.post('/', search)
// Router.get('/:id')

module.exports = Router