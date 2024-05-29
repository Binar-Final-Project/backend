const Router = require('express').Router()
const express = require('express');
const { getAllTickets, getTicketById } = require('../controllers/ticketDetails.controllers');

Router.get('/ticket', getAllTickets)
Router.get('/ticket/:ticketId', getTicketById);

module.exports = Router;