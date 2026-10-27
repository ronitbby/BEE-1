/**
 * db.js — MongoDB Atlas connection
 *
 * PURPOSE:
 *   This file contains a single function, connectDB(), that connects our
 *   Express server to MongoDB Atlas using the Mongoose library.
 *
 * HOW IT WORKS:
 *   mongoose.connect() takes the connection string from our .env file
 *   (process.env.MONGODB_URI) and opens a persistent connection to the
 *   cloud database. Once connected, every model (User, Book, etc.) will
 *   automatically use this connection.
 *
 * BEGINNER TIP — What is process.env?
 *   When our server starts, dotenv reads the .env file and attaches every
 *   variable to the global `process.env` object. So process.env.MONGODB_URI
 *   gives us the connection string without hard-coding it in the source code.
 */

const mongoose = require('mongoose'); // Mongoose is our MongoDB library

const connectDB = async () => {
  try {
    // mongoose.connect() returns a Promise, so we use await to wait for it
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    // In development we warn but DO NOT exit, so the server still starts.
    // This lets you test routes and write code without a live DB connection.
    // In production (NODE_ENV=production) we exit immediately — a server
    // without a database is useless in production.
    console.error(`❌ MongoDB connection error: ${error.message}`);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.warn('⚠️  Running WITHOUT database — DB-dependent routes will fail.');
    }
  }
};

module.exports = connectDB;
