const mongoose = require('mongoose')

const reservationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    userName: {
      type: String,
      required: true
    },
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: true
    },
    bookTitle: {
      type: String,
      required: true
    },
    reservedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'fulfilled'],
      default: 'active'
    }
  },
  { timestamps: true }
)

module.exports = mongoose.model('Reservation', reservationSchema)

