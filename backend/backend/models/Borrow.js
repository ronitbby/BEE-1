const mongoose = require('mongoose')

const borrowSchema = new mongoose.Schema(
  {
    borrowerName: {
      type: String,
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: true
    },
    borrowedOn: {
      type: Date,
      default: Date.now
    },
    dueDate: {
      type: Date,
      required: true
    },
    returnedOn: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['borrowed', 'returned'],
      default: 'borrowed'
    },
    renewCount: {
      type: Number,
      default: 0
    },
    fine: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
)

module.exports = mongoose.model('Borrow', borrowSchema)
