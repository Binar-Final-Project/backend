const { createTicket } = require('../controllers/ticket.controllers');
const { verifyToken } = require('../libs/middleware');

const Router = require('express').Router();

Router.post('/', verifyToken ,createTicket)

module.exports = Router