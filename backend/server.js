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

// User Registration (Default role is member)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Please provide name, email and password' })
    }

    const cleanEmail = email.toLowerCase()
    const existingUser = await User.findOne({ email: cleanEmail })
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists' })
    }

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    const user = await User.create({
      name,
      email: cleanEmail,
      password: hashedPassword,
      role: 'member',
      isActive: true
    })

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    res.status(201).json({
      message: 'Registration successful!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// User Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide both email and password' })
    }

    const cleanEmail = email.toLowerCase()
    const user = await User.findOne({ email: cleanEmail })
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Your account has been deactivated by an Admin. Contact library staff.' })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    res.json({
      message: 'Login successful!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get currently logged-in user profile
app.get('/api/auth/me', protect, (req, res) => {
  res.json({
    id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    isActive: req.user.isActive
  })
})

// Get books list (with search, genre filter, and archived filter)
app.get('/api/books', async (req, res) => {
  try {
    const { search, genre, includeArchived } = req.query
    const filter = {}

    if (includeArchived !== 'true') {
      filter.isArchived = { $ne: true }
    }

    if (genre) {
      filter.genre = genre
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
        { genre: { $regex: search, $options: 'i' } }
      ]
    }

    const books = await Book.find(filter).sort({ createdAt: -1 })
    res.json(books)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Add a new book (Librarian and Admin only)
app.post('/api/books', protect, restrictTo('librarian', 'admin'), async (req, res) => {
  try {
    const { title, author, genre, totalCopies, coverColor } = req.body

    if (!title || !author) {
      return res.status(400).json({ error: 'Title and author are required' })
    }

    const copies = Number(totalCopies) || 1
    const book = await Book.create({
      title,
      author,
      genre: genre || 'General',
      totalCopies: copies,
      available: copies,
      coverColor: coverColor || '#4f46e5',
      isArchived: false,
      borrowCount: 0
    })

    res.status(201).json(book)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Update book details (Librarian and Admin only)
app.put('/api/books/:id', protect, restrictTo('librarian', 'admin'), async (req, res) => {
  try {
    const book = await Book.findById(req.params.id)
    if (!book) {
      return res.status(404).json({ error: 'Book not found' })
    }

    const { title, author, genre, totalCopies, coverColor } = req.body

    if (title) book.title = title
    if (author) book.author = author
    if (genre) book.genre = genre
    if (coverColor) book.coverColor = coverColor

    if (totalCopies !== undefined) {
      const newTotal = Number(totalCopies)
      const diff = newTotal - book.totalCopies
      book.totalCopies = newTotal
      book.available = Math.max(0, book.available + diff)
    }

    await book.save()
    res.json(book)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})
