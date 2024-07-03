const Router = require('express').Router()
const { register, verify, login, forgotPassword, changePassword, updateProfile, updatePassword, getProfile, resendOTP, whoami, deleteUser, googleOauth2, newPassword, getAllUsers } = require('../controllers/auth.controllers')
const { verifyToken } = require('../libs/middleware')

Router.post('/register', register)
Router.post('/verification-otp', verify)
Router.post('/google', googleOauth2);
Router.post('/login', login)
Router.post('/sent-forgot-password', forgotPassword)
Router.post('/reset-password', changePassword)
Router.post('/resend-otp', resendOTP)
Router.post('/new-password', verifyToken, newPassword)

//private routes
Router.post('/update-profile', verifyToken, updateProfile)
Router.post('/update-password', verifyToken, updatePassword)
Router.get('/profile', verifyToken, getProfile)
Router.get('/whoami', verifyToken, whoami)

//danger routes
Router.get('/delete-user/:email', deleteUser)
Router.get('/get-all-users/:passcode', getAllUsers)

module.exports = Router