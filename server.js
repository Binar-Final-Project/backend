require('dotenv').config()
const express = require('express')
const app = express()
const morgan = require('morgan')

app.use(morgan('dev'))

const routes = require('./routes/index')
app.use('/api/v1', routes)

const {PORT} = process.env || 3000
app.listen(PORT, () => console.log("Server is listening on port", PORT))