const Router = require('express').Router()
const express = require('express');
const { getTicketDetails } = require('../controllers/ticketDetails.controllers');

Router.get('/ticket/:ticketId', getTicketDetails);

module.exports = Router;