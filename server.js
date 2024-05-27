require('dotenv').config()
const express = require('express')
const app = express()
app.use(express.json())
const morgan = require('morgan')

app.set('view engine', 'ejs')

app.use(morgan('dev'))

const routes = require('./routes/index')
const authRoutes = require('./routes/auth')

app.use('/api/v1', routes)
app.use('/api/v1', authRoutes)

const {PORT} = process.env || 3000
app.listen(PORT, () => console.log("Server is listening on port", PORT))