const Router = require('express').Router()
const { register, verify, login, forgotPassword, changePassword, updateProfile, updatePassword, getProfile, resendOTP, whoami, deleteUser, googleOauth2 } = require('../controllers/auth.controllers')
const { verifyToken } = require('../libs/middleware')
const passport = require('../libs/passport');

Router.post('/register', register)
Router.post('/verification-otp', verify)
Router.post('/login', login)
Router.post('/sent-forgot-password', forgotPassword)
Router.post('/reset-password', changePassword)
Router.post('/resend-otp', resendOTP)
Router.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);
Router.get('/google/callback',
    passport.authenticate('google', {
        failureRedirect: '/api/v1/auth/google',
        session: false
    }),
    googleOauth2
);


//private routes
Router.post('/update-profile', verifyToken, updateProfile)
Router.post('/update-password', verifyToken, updatePassword)
Router.get('/profile', verifyToken, getProfile)
Router.get('/whoami', verifyToken, whoami)

//danger routes
Router.get('/delete-user/:email', deleteUser)

module.exports = Router