const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const { generateToken, verifyToken } = require('../middleware/auth');
const { validateUserRegistration, validateUserLogin } = require('../middleware/validation');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', validateUserRegistration, async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone, dateOfBirth, gender } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Create new user - always as patient (doctors are created by admin)
    const user = new User({
      firstName,
      lastName,
      email,
      password,
      phone,
      dateOfBirth,
      gender,
      role: 'patient'
    });

    await user.save();

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error && error.code === 11000) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }
    if (error && error.name === 'ValidationError') {
      const details = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: 'Validation failed', details });
    }
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', validateUserLogin, async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // If role is specified, validate it matches the user's role
    if (role) {
      if (role === 'doctor' && user.role !== 'doctor') {
        return res.status(401).json({ message: 'This account is not registered as a doctor. Please use the Patient Login.' });
      }
      if (role === 'patient' && user.role === 'doctor') {
        return res.status(401).json({ message: 'This is a doctor account. Please use the Doctor Login.' });
      }
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated. Please contact support.' });
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = generateToken(user._id);

    // Get doctor profile if user is a doctor
    let doctorProfile = null;
    if (user.role === 'doctor') {
      doctorProfile = await Doctor.findOne({ userId: user._id });
    }

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        profileImage: user.profileImage
      },
      doctorProfile: doctorProfile ? {
        id: doctorProfile._id,
        specialization: doctorProfile.specialization,
        experience: doctorProfile.experience,
        isVerified: doctorProfile.isVerified,
        profileCompleted: doctorProfile.profileCompleted
      } : null
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// @route   POST /api/auth/register-doctor
// @desc    Register a new doctor
// @access  Public
router.post('/register-doctor', validateUserRegistration, async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      email, 
      password, 
      phone, 
      dateOfBirth, 
      gender,
      licenseNumber,
      specialization,
      experience,
      consultationFee
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Check if license number already exists
    const existingDoctor = await Doctor.findOne({ licenseNumber });
    if (existingDoctor) {
      return res.status(400).json({ message: 'Doctor with this license number already exists' });
    }

    // Create new user with doctor role
    const user = new User({
      firstName,
      lastName,
      email,
      password,
      phone,
      dateOfBirth,
      gender,
      role: 'doctor'
    });

    await user.save();

    // Create doctor profile
    const doctor = new Doctor({
      userId: user._id,
      licenseNumber,
      specialization,
      experience,
      consultationFee
    });

    await doctor.save();

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'Doctor registered successfully. Please complete your profile.',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified
      },
      doctorProfile: {
        id: doctor._id,
        specialization: doctor.specialization,
        experience: doctor.experience,
        isVerified: doctor.isVerified,
        profileCompleted: doctor.profileCompleted
      }
    });
  } catch (error) {
    console.error('Doctor registration error:', error);
    if (error && error.code === 11000) {
      // Determine which unique field collided
      const field = error.keyPattern?.email ? 'email' : error.keyPattern?.licenseNumber ? 'license number' : 'field';
      return res.status(400).json({ message: `A user already exists with this ${field}` });
    }
    if (error && error.name === 'ValidationError') {
      const details = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: 'Validation failed', details });
    }
    res.status(500).json({ message: 'Server error during doctor registration' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = req.user;

    // Get doctor profile if user is a doctor
    let doctorProfile = null;
    if (user.role === 'doctor') {
      doctorProfile = await Doctor.findOne({ userId: user._id });
    }

    res.json({
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        profileImage: user.profileImage,
        address: user.address,
        emergencyContact: user.emergencyContact,
        medicalHistory: user.medicalHistory,
        allergies: user.allergies,
        medications: user.medications
      },
      doctorProfile: doctorProfile ? {
        id: doctorProfile._id,
        licenseNumber: doctorProfile.licenseNumber,
        specialization: doctorProfile.specialization,
        experience: doctorProfile.experience,
        consultationFee: doctorProfile.consultationFee,
        bio: doctorProfile.bio,
        languages: doctorProfile.languages,
        services: doctorProfile.services,
        rating: doctorProfile.rating,
        isVerified: doctorProfile.isVerified,
        profileCompleted: doctorProfile.profileCompleted,
        availability: doctorProfile.availability
      } : null
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error while fetching profile' });
  }
});

// @route   POST /api/auth/refresh
// @desc    Refresh JWT token
// @access  Private
router.post('/refresh', verifyToken, async (req, res) => {
  try {
    const token = generateToken(req.user._id);
    res.json({
      message: 'Token refreshed successfully',
      token
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ message: 'Server error during token refresh' });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', verifyToken, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// @route   POST /api/auth/forgot-password
// @desc    Request password reset
// @access  Public
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({ message: 'If the email exists, a password reset link has been sent' });
    }

    // In a real application, you would:
    // 1. Generate a reset token
    // 2. Save it to the database with expiration
    // 3. Send an email with the reset link
    
    // For now, we'll just return a success message
    res.json({ message: 'If the email exists, a password reset link has been sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error during password reset request' });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // In a real application, you would:
    // 1. Verify the reset token
    // 2. Check if it's not expired
    // 3. Update the user's password
    // 4. Invalidate the reset token

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error during password reset' });
  }
});

module.exports = router;
