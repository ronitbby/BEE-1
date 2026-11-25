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

// Archive or unarchive book (Librarian and Admin only)
app.patch('/api/books/:id/archive', protect, restrictTo('librarian', 'admin'), async (req, res) => {
  try {
    const book = await Book.findById(req.params.id)
    if (!book) {
      return res.status(404).json({ error: 'Book not found' })
    }

    book.isArchived = !book.isArchived
    await book.save()

    res.json({
      message: book.isArchived ? 'Book archived successfully' : 'Book restored from archive',
      book
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Delete book permanently (Librarian and Admin only)
app.delete('/api/books/:id', protect, restrictTo('librarian', 'admin'), async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id)
    if (!book) {
      return res.status(404).json({ error: 'Book not found' })
    }
    res.json({ message: 'Book deleted successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get borrowing records for the logged-in member
app.get('/api/borrows/my', protect, async (req, res) => {
  try {
    const borrows = await Borrow.find({
      $or: [
        { userId: req.user._id },
        { borrowerName: req.user.name }
      ]
    }).populate('bookId').sort({ borrowedOn: -1 })

    const enriched = borrows.map((b) => {
      const bObj = b.toObject()
      bObj.currentFine = calculateFine(b)
      return bObj
    })

    const activeBorrows = enriched.filter((b) => b.status === 'borrowed')
    const historyBorrows = enriched.filter((b) => b.status === 'returned')
    const totalPendingFine = activeBorrows.reduce((sum, b) => sum + (b.currentFine || 0), 0)

    res.json({
      active: activeBorrows,
      history: historyBorrows,
      totalFine: totalPendingFine
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get active borrows (Librarian and Admin only)
app.get('/api/borrows', protect, restrictTo('librarian', 'admin'), async (req, res) => {
  try {
    const borrows = await Borrow.find({ status: 'borrowed' })
      .populate('bookId')
      .populate('userId', 'name email')
      .sort({ borrowedOn: -1 })

    const enriched = borrows.map((b) => {
      const obj = b.toObject()
      obj.currentFine = calculateFine(b)
      return obj
    })

    res.json(enriched)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get all borrow records (Librarian and Admin only)
app.get('/api/borrows/all', protect, restrictTo('librarian', 'admin'), async (req, res) => {
  try {
    const borrows = await Borrow.find()
      .populate('bookId')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })

    const enriched = borrows.map((b) => {
      const obj = b.toObject()
      obj.currentFine = calculateFine(b)
      return obj
    })

    res.json(enriched)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get overdue borrows (Librarian and Admin only)
app.get('/api/borrows/overdue', protect, restrictTo('librarian', 'admin'), async (req, res) => {
  try {
    const now = new Date()
    const overdueBorrows = await Borrow.find({
      status: 'borrowed',
      dueDate: { $lt: now }
    }).populate('bookId').populate('userId', 'name email')

    const enriched = overdueBorrows.map((b) => {
      const obj = b.toObject()
      obj.currentFine = calculateFine(b)
      const diffDays = Math.ceil(Math.abs(now - new Date(b.dueDate)) / (1000 * 60 * 60 * 24))
      obj.daysOverdue = diffDays
      return obj
    })

    res.json(enriched)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Issue a book to a member (Librarian and Admin only)
app.post('/api/borrows/issue', protect, restrictTo('librarian', 'admin'), async (req, res) => {
  try {
    const { borrowerName, userEmail, bookId, durationDays } = req.body

    const book = await Book.findById(bookId)
    if (!book) {
      return res.status(404).json({ error: 'Book not found' })
    }
    if (book.isArchived) {
      return res.status(400).json({ error: 'Cannot issue an archived book' })
    }
    if (book.available < 1) {
      return res.status(400).json({ error: 'No copies of this book are currently available' })
    }

    let linkedUser = null
    if (userEmail) {
      linkedUser = await User.findOne({ email: userEmail.toLowerCase() })
    }

    const days = Number(durationDays) || 14
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + days)

    book.available -= 1
    book.borrowCount = (book.borrowCount || 0) + 1
    await book.save()

    const borrower = borrowerName || (linkedUser ? linkedUser.name : 'Library Member')

    const borrow = await Borrow.create({
      borrowerName: borrower,
      userId: linkedUser ? linkedUser._id : undefined,
      bookId: book._id,
      borrowedOn: new Date(),
      dueDate,
      status: 'borrowed',
      renewCount: 0,
      fine: 0
    })

    res.status(201).json(borrow)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Renew a borrowed book (Librarian and Admin only)
app.patch('/api/borrows/:id/renew', protect, restrictTo('librarian', 'admin'), async (req, res) => {
  try {
    const borrow = await Borrow.findById(req.params.id).populate('bookId')
    if (!borrow || borrow.status !== 'borrowed') {
      return res.status(400).json({ error: 'Cannot renew — record not found or book already returned' })
    }

    const currentDue = new Date(borrow.dueDate)
    const baseDate = currentDue > new Date() ? currentDue : new Date()
    baseDate.setDate(baseDate.getDate() + 14)

    borrow.dueDate = baseDate
    borrow.renewCount = (borrow.renewCount || 0) + 1
    await borrow.save()

    res.json({ message: 'Book renewed successfully for 14 more days!', borrow })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Return a borrowed book (Librarian and Admin only)
app.patch('/api/borrows/:id/return', protect, restrictTo('librarian', 'admin'), async (req, res) => {
  try {
    const borrow = await Borrow.findById(req.params.id)
    if (!borrow || borrow.status === 'returned') {
      return res.status(400).json({ error: 'Invalid record or book has already been returned' })
    }

    const finalFine = calculateFine(borrow)
    borrow.status = 'returned'
    borrow.returnedOn = new Date()
    borrow.fine = finalFine
    await borrow.save()

    await Book.findByIdAndUpdate(borrow.bookId, { $inc: { available: 1 } })

    res.json({
      message: 'Book returned successfully!',
      finePaid: finalFine
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get reservations for the logged-in member
app.get('/api/reservations/my', protect, async (req, res) => {
  try {
    const reservations = await Reservation.find({
      userId: req.user._id,
      status: 'active'
    }).populate('bookId').sort({ reservedAt: -1 })
    res.json(reservations)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Reserve a book
app.post('/api/reservations', protect, async (req, res) => {
  try {
    const { bookId } = req.body
    const book = await Book.findById(bookId)
    if (!book) {
      return res.status(404).json({ error: 'Book not found' })
    }

    const existing = await Reservation.findOne({
      userId: req.user._id,
      bookId: book._id,
      status: 'active'
    })
    if (existing) {
      return res.status(400).json({ error: 'You already have an active reservation for this book' })
    }

    const reservation = await Reservation.create({
      userId: req.user._id,
      userName: req.user.name,
      bookId: book._id,
      bookTitle: book.title,
      status: 'active'
    })

    res.status(201).json(reservation)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Cancel a reservation
app.delete('/api/reservations/:id', protect, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' })
    }

    if (reservation.userId.toString() !== req.user._id.toString() && req.user.role === 'member') {
      return res.status(403).json({ error: 'Not authorized to cancel this reservation' })
    }

    reservation.status = 'cancelled'
    await reservation.save()

    res.json({ message: 'Reservation cancelled successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// System statistics (Admin only)
app.get('/api/admin/stats', protect, restrictTo('admin'), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments()
    const totalMembers = await User.countDocuments({ role: 'member' })
    const totalLibrarians = await User.countDocuments({ role: 'librarian' })
    const totalAdmins = await User.countDocuments({ role: 'admin' })

    const totalBooks = await Book.countDocuments()
    const archivedBooks = await Book.countDocuments({ isArchived: true })

    const activeBorrowsCount = await Borrow.countDocuments({ status: 'borrowed' })
    const returnedBorrowsCount = await Borrow.countDocuments({ status: 'returned' })

    const activeBorrows = await Borrow.find({ status: 'borrowed' })
    let overdueCount = 0
    let totalAccruedFine = 0

    for (const item of activeBorrows) {
      const fine = calculateFine(item)
      if (fine > 0) {
        overdueCount += 1
        totalAccruedFine += fine
      }
    }

    const popularBooks = await Book.find().sort({ borrowCount: -1 }).limit(5)

    res.json({
      users: {
        total: totalUsers,
        members: totalMembers,
        librarians: totalLibrarians,
        admins: totalAdmins
      },
      books: {
        total: totalBooks,
        archived: archivedBooks,
        active: totalBooks - archivedBooks
      },
      circulation: {
        activeIssues: activeBorrowsCount,
        totalReturned: returnedBorrowsCount,
        overdueIssues: overdueCount,
        totalFines: totalAccruedFine
      },
      popularBooks
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// List all registered users (Admin only)
app.get('/api/admin/users', protect, restrictTo('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 })
    res.json(users)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Update user role (Admin only)
app.patch('/api/admin/users/:id/role', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { role } = req.body
    if (!['member', 'librarian', 'admin'].includes(role)) {
      return res.status(400).json({ error: "Invalid role. Must be 'member', 'librarian', or 'admin'." })
    }

    if (req.params.id === req.user._id.toString() && role !== 'admin') {
      return res.status(400).json({ error: 'You cannot demote yourself from the admin role.' })
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password')

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.json({ message: `Role updated to ${role}`, user })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Activate or deactivate user account (Admin only)
app.patch('/api/admin/users/:id/status', protect, restrictTo('admin'), async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ error: 'You cannot deactivate your own admin account.' })
    }

    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    user.isActive = !user.isActive
    await user.save()

    res.json({
      message: user.isActive ? 'User account activated' : 'User account deactivated',
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.originalUrl} not found on this server` })
})

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message)
  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal Server Error'
  })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
