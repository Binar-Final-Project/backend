const Router = require('express').Router()
const { history } = require('../controllers/transaction.controller')
const { verifyToken } = require('../libs/middleware')


Router.get('/history', verifyToken, history)

//
module.exports = Router