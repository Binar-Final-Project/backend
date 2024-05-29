const { search, add } = require('../controllers/flight.controllers')
const Router = require('express').Router()

Router.post('/', search)
Router.get('/test', add)
// Router.get('/:id')

module.exports = Router