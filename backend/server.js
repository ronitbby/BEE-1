require('dotenv').config()
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const User = require('./models/User')
const Book = require('./models/Book')
const Borrow = require('./models/Borrow')
const Reservation = require('./models/Reservation')

const { protect, restrictTo } = require('./middleware/auth')

const app = express()

app.use(cors())
app.use(express.json())

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_replace_before_production'
const FINE_PER_DAY = Number(process.env.FINE_PER_DAY) || 2

// Helper function to calculate fine for overdue books
function calculateFine(borrow) {
  if (borrow.status === 'borrowed' && borrow.dueDate) {
    const now = new Date()
    const dueDate = new Date(borrow.dueDate)

    if (dueDate < now) {
      const differenceInMs = now.getTime() - dueDate.getTime()
      const overdueDays = Math.ceil(differenceInMs / (1000 * 60 * 60 * 24))
      return overdueDays * FINE_PER_DAY
    }
  }
  return borrow.fine || 0
}

// Database Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected successfully')
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message)
    process.exit(1)
  })

// Health check route
app.get('/api/health', (req, res) => {
  const connectionStates = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting'
  }
  const state = connectionStates[mongoose.connection.readyState] || 'Unknown'

  res.json({
    status: 'ok',
    database: state,
    timestamp: new Date().toISOString()
  })
})

