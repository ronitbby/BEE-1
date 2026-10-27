/**
 * app.js — Express application setup
 *
 * PURPOSE:
 *   This file creates and configures the Express "app" object.
 *   Think of it as the control panel that decides:
 *     - What middleware runs on every request
 *     - What URL prefixes map to which route files
 *
 * We keep this separate from server.js so we can import `app` into
 * our Jest tests without actually starting the HTTP server.
 *
 * BEGINNER TIP — What is middleware?
 *   Middleware is a function that runs between the moment a request
 *   arrives and the moment our code sends a response.
 *   The flow looks like this:
 *
 *   Request → [morgan logger] → [cors] → [express.json()] → [our route] → Response
 *
 *   Each middleware calls next() to pass control to the next one.
 */

const express = require('express');
const cors    = require('cors');    // Allows cross-origin requests (React on port 5173 → API on port 5000)
const morgan  = require('morgan'); // Logs every HTTP request to the console

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────

// cors() — Allow requests from any origin during development.
// In production we will lock this down to our Vercel frontend URL.
app.use(cors());

// express.json() — Parse incoming request bodies that contain JSON.
// Without this, req.body would always be undefined.
app.use(express.json());

// morgan('dev') — Log requests in a colorful, short format, e.g.:
// GET /api/v1/health 200 3.456 ms - 27
app.use(morgan('dev'));

// ── Health-check route ────────────────────────────────────────────────────────
// This is a simple route that lets us verify the server is running.
// A health-check returns a 200 OK with a small JSON body.
// Render.com also uses this kind of endpoint to check if the service is alive.
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Library Management System API is running 🚀',
    timestamp: new Date().toISOString(),
  });
});

// ── Placeholder for future routes ─────────────────────────────────────────────
// We will uncomment these one by one as we build each feature:
// app.use('/api/v1/auth',         require('./routes/auth.routes'));
// app.use('/api/v1/books',        require('./routes/book.routes'));
// app.use('/api/v1/borrow',       require('./routes/borrow.routes'));
// app.use('/api/v1/reservations', require('./routes/reservation.routes'));
// app.use('/api/v1/fines',        require('./routes/fine.routes'));
// app.use('/api/v1/admin',        require('./routes/admin.routes'));

// ── 404 handler ───────────────────────────────────────────────────────────────
// If no route above matched, send a 404 Not Found response.
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────────────────────────
// If any route or middleware calls next(error), Express skips to this handler.
// The four-parameter signature (err, req, res, next) tells Express this is an
// error-handling middleware — do NOT remove the `next` parameter.
app.use((err, req, res, next) => {
  console.error('🔴 Unhandled error:', err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

module.exports = app;
