require('dotenv').config()
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const User = require('./models/User')
const Book = require('./models/Book')
const Borrow = require('./models/Borrow')
const Reservation = require('./models/Reservation')

const sampleBooks = [
  { title: 'Harry Potter and the Sorcerer\'s Stone', author: 'J.K. Rowling',          genre: 'Fiction',     totalCopies: 5, available: 4, coverColor: '#7c3aed', borrowCount: 12 },
  { title: 'The Alchemist',                          author: 'Paulo Coelho',           genre: 'Fiction',     totalCopies: 4, available: 3, coverColor: '#b45309', borrowCount: 9 },
  { title: 'Atomic Habits',                          author: 'James Clear',            genre: 'Self-Help',   totalCopies: 3, available: 2, coverColor: '#0369a1', borrowCount: 15 },
  { title: 'To Kill a Mockingbird',                  author: 'Harper Lee',             genre: 'Fiction',     totalCopies: 4, available: 4, coverColor: '#065f46', borrowCount: 6 },
  { title: 'A Brief History of Time',                author: 'Stephen Hawking',        genre: 'Science',     totalCopies: 2, available: 1, coverColor: '#1e3a5f', borrowCount: 8 },
  { title: 'The Great Gatsby',                       author: 'F. Scott Fitzgerald',    genre: 'Fiction',     totalCopies: 3, available: 3, coverColor: '#92400e', borrowCount: 5 },
  { title: 'Thinking, Fast and Slow',                author: 'Daniel Kahneman',        genre: 'Psychology',  totalCopies: 2, available: 2, coverColor: '#7f1d1d', borrowCount: 7 },
  { title: 'Sapiens',                                author: 'Yuval Noah Harari',      genre: 'History',     totalCopies: 4, available: 3, coverColor: '#14532d', borrowCount: 11 },
  { title: 'Rich Dad Poor Dad',                      author: 'Robert Kiyosaki',        genre: 'Finance',     totalCopies: 3, available: 3, coverColor: '#78350f', borrowCount: 14 },
  { title: 'The Psychology of Money',                author: 'Morgan Housel',          genre: 'Finance',     totalCopies: 2, available: 2, coverColor: '#1e40af', borrowCount: 10 },
  { title: 'Deep Work',                              author: 'Cal Newport',            genre: 'Self-Help',   totalCopies: 2, available: 2, coverColor: '#581c87', borrowCount: 4 },
  { title: '1984',                                   author: 'George Orwell',          genre: 'Fiction',     totalCopies: 5, available: 5, coverColor: '#1c1917', borrowCount: 13 },
  { title: 'The Lean Startup',                       author: 'Eric Ries',              genre: 'Technology',  totalCopies: 2, available: 2, coverColor: '#064e3b', borrowCount: 3 },
  { title: 'Introduction to Algorithms',             author: 'Cormen & Others',        genre: 'Technology',  totalCopies: 3, available: 3, coverColor: '#312e81', borrowCount: 16 },
  { title: 'Clean Code',                             author: 'Robert C. Martin',       genre: 'Technology',  totalCopies: 2, available: 1, coverColor: '#1e3a5f', borrowCount: 18 },
  { title: 'The Diary of a Young Girl',              author: 'Anne Frank',             genre: 'Biography',   totalCopies: 3, available: 3, coverColor: '#854d0e', borrowCount: 2 },
  { title: 'Wings of Fire',                          author: 'A.P.J. Abdul Kalam',     genre: 'Biography',   totalCopies: 4, available: 4, coverColor: '#dc2626', borrowCount: 17 },
  { title: 'The Hobbit',                             author: 'J.R.R. Tolkien',         genre: 'Fiction',     totalCopies: 3, available: 3, coverColor: '#15803d', borrowCount: 6 },
  { title: 'Zero to One',                            author: 'Peter Thiel',            genre: 'Technology',  totalCopies: 2, available: 2, coverColor: '#7c2d12', borrowCount: 7 },
  { title: 'Who Moved My Cheese',                    author: 'Spencer Johnson',        genre: 'Self-Help',   totalCopies: 3, available: 3, coverColor: '#0c4a6e', borrowCount: 5 },
]

async function seed() {
  console.log('Connecting to MongoDB Atlas...')
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected!')

  // 1. Clear existing collections for a clean slate
  await User.deleteMany({})
  await Book.deleteMany({})
  await Borrow.deleteMany({})
  await Reservation.deleteMany({})
  console.log('Cleared existing users, books, borrows, and reservations.')

  // 2. Hash default passwords
  const adminPassword = await bcrypt.hash('admin123', 10)
  const librarianPassword = await bcrypt.hash('librarian123', 10)
  const memberPassword = await bcrypt.hash('member123', 10)

  // 3. Create Users for all 3 roles
  const adminUser = await User.create({
    name: 'College Admin',
    email: 'admin@library.com',
    password: adminPassword,
    role: 'admin',
    isActive: true,
  })

  const librarianUser = await User.create({
    name: 'Head Librarian Sharma',
    email: 'librarian@library.com',
    password: librarianPassword,
    role: 'librarian',
    isActive: true,
  })

  const memberUser = await User.create({
    name: 'Ronit Khanna (Member)',
    email: 'member@library.com',
    password: memberPassword,
    role: 'member',
    isActive: true,
  })

  console.log('✅ Created 3 Role Accounts:')
  console.log('   👑 Admin:     admin@library.com     / admin123')
  console.log('   📚 Librarian: librarian@library.com / librarian123')
  console.log('   👤 Member:    member@library.com    / member123')

  // 4. Insert Books
  const createdBooks = await Book.insertMany(sampleBooks)
  console.log(`✅ Created ${createdBooks.length} books in library collection.`)

  // 5. Create Sample Borrows:
  // - 1 active normal borrow for Ronit
  // - 1 OVERDUE borrow for Ronit (due 4 days ago -> ₹8 fine)
  // - 1 past returned borrow
  const fourDaysAgo = new Date()
  fourDaysAgo.setDate(fourDaysAgo.getDate() - 4)

  const fourteenDaysFromNow = new Date()
  fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14)

  const tenDaysAgo = new Date()
  tenDaysAgo.setDate(tenDaysAgo.getDate() - 10)

  // Overdue record
  await Borrow.create({
    borrowerName: memberUser.name,
    userId: memberUser._id,
    bookId: createdBooks[0]._id, // Harry Potter
    borrowedOn: tenDaysAgo,
    dueDate: fourDaysAgo,        // 4 days overdue!
    status: 'borrowed',
    renewCount: 0,
    fine: 0,
  })

  // Active on-time record
  await Borrow.create({
    borrowerName: memberUser.name,
    userId: memberUser._id,
    bookId: createdBooks[2]._id, // Atomic Habits
    borrowedOn: new Date(),
    dueDate: fourteenDaysFromNow,
    status: 'borrowed',
    renewCount: 0,
    fine: 0,
  })

  // Returned history record
  await Borrow.create({
    borrowerName: memberUser.name,
    userId: memberUser._id,
    bookId: createdBooks[1]._id, // The Alchemist
    borrowedOn: new Date(Date.now() - 30 * 86400000),
    dueDate: new Date(Date.now() - 16 * 86400000),
    returnedOn: new Date(Date.now() - 15 * 86400000),
    status: 'returned',
    renewCount: 1,
    fine: 0,
  })

  console.log('✅ Created sample active, overdue and returned borrows.')

  // 6. Create Sample Reservation
  await Reservation.create({
    userId: memberUser._id,
    userName: memberUser.name,
    bookId: createdBooks[4]._id, // A Brief History of Time
    bookTitle: createdBooks[4].title,
    status: 'active',
  })
  console.log('✅ Created sample reservation.')

  console.log('\n🎉 Database Seed Completed Successfully!')
  mongoose.connection.close()
}

seed().catch(err => {
  console.error('Seed Error:', err)
  process.exit(1)
})
