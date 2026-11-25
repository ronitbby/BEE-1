const mongoose = require('mongoose')

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    author: {
      type: String,
      required: true,
      trim: true
    },
    genre: {
      type: String,
      default: 'General'
    },
    totalCopies: {
      type: Number,
      default: 1,
      min: 0
    },
    available: {
      type: Number,
      default: 1,
      min: 0
    },
    coverColor: {
      type: String,
      default: '#4f46e5'
    },
    isArchived: {
      type: Boolean,
      default: false
    },
    borrowCount: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
)

module.exports = mongoose.model('Book', bookSchema)
