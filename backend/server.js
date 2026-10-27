/**
 * server.js — Application entry point
 *
 * PURPOSE:
 *   This is the very first file Node.js runs when we type `npm start` or
 *   `npm run dev`. Its only job is to:
 *     1. Load environment variables from the .env file
 *     2. Connect to MongoDB Atlas
 *     3. Start the Express HTTP server on the configured PORT
 *
 * WHY IS THIS SEPARATE FROM app.js?
 *   app.js sets up all the Express logic (routes, middleware).
 *   server.js handles the actual network "listen" call.
 *   This split makes it easy to import `app` in Jest tests without
 *   accidentally opening a real network port during testing.
 *
 * BEGINNER TIP — What is require('dotenv').config()?
 *   This reads the .env file in the current directory and loads every
 *   line (e.g. PORT=5000) into process.env so any file in the project
 *   can access it as process.env.PORT.
 *   It MUST be called before any other require() that uses process.env.
 */

require('dotenv').config(); // Load .env FIRST — before anything else

const app       = require('./app');       // Our configured Express app
const connectDB = require('./config/db'); // MongoDB connection function

// Read PORT from .env, fall back to 5000 if it is not set
const PORT = process.env.PORT || 5000;

// connectDB() is async (returns a Promise).
// We call it, wait for the DB to connect, THEN start the HTTP server.
// If the DB connection fails, connectDB() will call process.exit(1) for us.
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/api/v1/health`);
    console.log(`   Environment : ${process.env.NODE_ENV}`);
  });
});
