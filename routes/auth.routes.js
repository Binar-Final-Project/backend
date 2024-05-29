const Router = require('express').Router()
const { register, verify, login, forgotPassword, changePassword, updateProfile, updatePassword, getProfile, deleteAllUsers } = require('../controllers/auth.controllers')
const { verifyToken } = require('../libs/middleware')

Router.post('/register', register)
Router.post('/verification-otp', verify)
Router.post('/login', login)
Router.post('/sent-forgot-password', forgotPassword)
Router.post('/reset-password', changePassword)

//private routes
Router.post('/update-profile', verifyToken, updateProfile)
Router.post('/update-password', verifyToken, updatePassword)
Router.get('/me', verifyToken, getProfile)

//danger routes
Router.get('/delete-user', deleteAllUsers)

module.exports = Router