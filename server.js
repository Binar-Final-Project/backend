require('dotenv').config()
const express = require('express')
const app = express()
app.use(express.json())
const morgan = require('morgan')
const cors = require('cors')

app.set('view engine', 'ejs')

app.use(cors({
    origin: 'http://localhost:5173',
    optionsSuccessStatus: 200
}))
app.use(morgan('dev'))

const routes = require('./routes/index')

app.use('/api/v1', routes)

const {PORT} = process.env || 3000
app.listen(PORT, () => console.log("Server is listening on port", PORT))