const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Doctor = require('../models/Doctor');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token. User not found.' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired.' });
    }
    res.status(500).json({ message: 'Server error during token verification.' });
  }
};

// Check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }
  next();
};

// Check if user is doctor
const requireDoctor = async (req, res, next) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ message: 'Access denied. Doctor privileges required.' });
    }

    // Check if doctor profile exists and is verified
    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor) {
      return res.status(403).json({ message: 'Doctor profile not found.' });
    }

    if (!doctor.isVerified) {
      return res.status(403).json({ message: 'Doctor profile not verified.' });
    }

    req.doctor = doctor;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error during doctor verification.' });
  }
};

// Check if user is patient
const requirePatient = (req, res, next) => {
  if (req.user.role !== 'patient') {
    return res.status(403).json({ message: 'Access denied. Patient privileges required.' });
  }
  next();
};

// Optional authentication (for public routes that can benefit from user context)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
        
        // If user is doctor, also populate doctor profile
        if (user.role === 'doctor') {
          const doctor = await Doctor.findOne({ userId: user._id });
          req.doctor = doctor;
        }
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};

// Rate limiting for authentication endpoints
const authRateLimit = (req, res, next) => {
  // This would typically be implemented with express-rate-limit
  // For now, we'll just pass through
  next();
};

module.exports = {
  generateToken,
  verifyToken,
  requireAdmin,
  requireDoctor,
  requirePatient,
  optionalAuth,
  authRateLimit
};
