const Router = require('express').Router()
const { register, verify, login, forgotPassword, changePassword, updateProfile, updatePassword, getProfile } = require('../controllers/auth.controllers')
const { verifyToken } = require('../libs/middleware')

Router.post('/users/register', register)
Router.post('/users/verification-otp', verify)
Router.post('/users/login', login)
Router.post('/users/sent-forgot-password', forgotPassword)
Router.post('/users/reset-password', changePassword)

//private routes
Router.post('/users/update-profile', verifyToken, updateProfile)
Router.post('/users/update-password', verifyToken, updatePassword)
Router.get('/users/me', verifyToken, getProfile)

module.exports = Router