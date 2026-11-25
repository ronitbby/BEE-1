const jwt = require('jsonwebtoken')
const User = require('../models/User')

// Middleware to verify JWT token and attach user to req.user
async function protect(req, res, next) {
  let token = null

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1]
  }

  if (!token) {
    return res.status(401).json({ error: 'Not authorized — no token provided. Please log in.' })
  }

  try {
    const secret = process.env.JWT_SECRET || 'dev_secret_replace_before_production'
    const decoded = jwt.verify(token, secret)

    const user = await User.findById(decoded.id).select('-password')

    if (!user) {
      return res.status(401).json({ error: 'User belonging to this token no longer exists.' })
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact an admin.' })
    }

    req.user = user
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' })
  }
}

// Middleware to restrict access based on allowed user roles
function restrictTo(...roles) {
  return function (req, res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      const currentRole = req.user ? req.user.role : 'guest'
      return res.status(403).json({
        error: `Access denied. Role '${currentRole}' is not authorized to perform this action.`
      })
    }
    next()
  }
}

module.exports = { protect, restrictTo }

