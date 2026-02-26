require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const connectDB = require('./config/db')

const app = express()

// Connect to database
connectDB()

// Middleware
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Routes
app.use('/api/auth', require('./routes/authRoutes'))
app.use('/api/documents', require('./routes/documentRoutes'))
app.use('/api/notes', require('./routes/noteRoutes'))
app.use('/api/tags', require('./routes/tagRoutes'))
app.use('/api/categories', require('./routes/categoryRoutes'))

// Error handling middleware
app.use(require('./middleware/errorHandler'))

const PORT = process.env.PORT || 5000

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
