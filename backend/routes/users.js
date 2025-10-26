const express = require('express');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const { verifyToken, requirePatient } = require('../middleware/auth');
const { validateObjectId, validatePagination } = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Profile retrieved successfully',
      user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error while fetching profile' });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      dateOfBirth,
      gender,
      address,
      emergencyContact,
      medicalHistory,
      allergies,
      medications
    } = req.body;

    const updateData = {};
    
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone) updateData.phone = phone;
    if (dateOfBirth) updateData.dateOfBirth = dateOfBirth;
    if (gender) updateData.gender = gender;
    if (address) updateData.address = address;
    if (emergencyContact) updateData.emergencyContact = emergencyContact;
    if (medicalHistory) updateData.medicalHistory = medicalHistory;
    if (allergies) updateData.allergies = allergies;
    if (medications) updateData.medications = medications;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error while updating profile' });
  }
});

// @route   POST /api/users/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');
    
    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error while changing password' });
  }
});

// @route   GET /api/users/appointments
// @desc    Get user's appointments
// @access  Private
router.get('/appointments', verifyToken, validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const appointments = await Appointment.find({ patientId: req.user._id })
      .populate('doctorId', 'specialization consultationFee')
      .populate('patientId', 'firstName lastName email')
      .sort({ appointmentDate: -1, appointmentTime: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Appointment.countDocuments({ patientId: req.user._id });

    res.json({
      message: 'Appointments retrieved successfully',
      appointments,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalAppointments: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ message: 'Server error while fetching appointments' });
  }
});

// @route   GET /api/users/appointments/:id
// @desc    Get specific appointment details
// @access  Private
router.get('/appointments/:id', verifyToken, validateObjectId('id'), async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('doctorId', 'specialization consultationFee')
      .populate('patientId', 'firstName lastName email phone');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if user owns this appointment
    if (appointment.patientId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      message: 'Appointment retrieved successfully',
      appointment
    });
  } catch (error) {
    console.error('Get appointment error:', error);
    res.status(500).json({ message: 'Server error while fetching appointment' });
  }
});

// @route   PUT /api/users/appointments/:id/cancel
// @desc    Cancel an appointment
// @access  Private
router.put('/appointments/:id/cancel', verifyToken, validateObjectId('id'), async (req, res) => {
  try {
    const { reason } = req.body;

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if user owns this appointment
    if (appointment.patientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if appointment can be cancelled
    if (!appointment.canBeCancelled()) {
      return res.status(400).json({ 
        message: 'Appointment cannot be cancelled. Must be cancelled at least 24 hours before the appointment time.' 
      });
    }

    // Calculate refund amount
    const refundAmount = appointment.calculateRefund();

    // Update appointment status
    appointment.status = 'cancelled';
    appointment.cancellation = {
      cancelledBy: 'patient',
      cancelledAt: new Date(),
      reason: reason || 'Cancelled by patient',
      refundAmount,
      refundStatus: refundAmount > 0 ? 'pending' : 'processed'
    };

    await appointment.save();

    res.json({
      message: 'Appointment cancelled successfully',
      appointment,
      refundAmount
    });
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({ message: 'Server error while cancelling appointment' });
  }
});

// @route   POST /api/users/appointments/:id/reschedule
// @desc    Reschedule an appointment
// @access  Private
router.post('/appointments/:id/reschedule', verifyToken, validateObjectId('id'), async (req, res) => {
  try {
    const { newDate, newTime } = req.body;

    if (!newDate || !newTime) {
      return res.status(400).json({ message: 'New date and time are required' });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if user owns this appointment
    if (appointment.patientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if appointment can be rescheduled
    if (!appointment.canBeRescheduled()) {
      return res.status(400).json({ 
        message: 'Appointment cannot be rescheduled. Must be rescheduled at least 2 hours before the appointment time.' 
      });
    }

    // Update appointment
    appointment.appointmentDate = newDate;
    appointment.appointmentTime = newTime;
    appointment.status = 'rescheduled';

    await appointment.save();

    res.json({
      message: 'Appointment rescheduled successfully',
      appointment
    });
  } catch (error) {
    console.error('Reschedule appointment error:', error);
    res.status(500).json({ message: 'Server error while rescheduling appointment' });
  }
});

// @route   POST /api/users/appointments/:id/rate
// @desc    Rate an appointment
// @access  Private
router.post('/appointments/:id/rate', verifyToken, validateObjectId('id'), async (req, res) => {
  try {
    const { score, review } = req.body;

    if (!score || score < 1 || score > 5) {
      return res.status(400).json({ message: 'Rating score must be between 1 and 5' });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if user owns this appointment
    if (appointment.patientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if appointment is completed
    if (appointment.status !== 'completed') {
      return res.status(400).json({ message: 'Can only rate completed appointments' });
    }

    // Check if already rated
    if (appointment.rating.score) {
      return res.status(400).json({ message: 'Appointment already rated' });
    }

    // Update appointment rating
    appointment.rating = {
      score,
      review: review || '',
      ratedAt: new Date()
    };

    await appointment.save();

    // Update doctor's average rating
    const doctor = await Doctor.findById(appointment.doctorId);
    if (doctor) {
      const allRatings = await Appointment.find({ 
        doctorId: appointment.doctorId, 
        'rating.score': { $exists: true } 
      });
      
      const totalScore = allRatings.reduce((sum, apt) => sum + apt.rating.score, 0);
      const averageRating = totalScore / allRatings.length;
      
      doctor.rating = {
        average: Math.round(averageRating * 10) / 10,
        count: allRatings.length
      };
      
      await doctor.save();
    }

    res.json({
      message: 'Appointment rated successfully',
      rating: appointment.rating
    });
  } catch (error) {
    console.error('Rate appointment error:', error);
    res.status(500).json({ message: 'Server error while rating appointment' });
  }
});

// @route   GET /api/users/medical-history
// @desc    Get user's medical history
// @access  Private
router.get('/medical-history', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('medicalHistory allergies medications');
    
    res.json({
      message: 'Medical history retrieved successfully',
      medicalHistory: user.medicalHistory,
      allergies: user.allergies,
      medications: user.medications
    });
  } catch (error) {
    console.error('Get medical history error:', error);
    res.status(500).json({ message: 'Server error while fetching medical history' });
  }
});

// @route   PUT /api/users/medical-history
// @desc    Update user's medical history
// @access  Private
router.put('/medical-history', verifyToken, async (req, res) => {
  try {
    const { medicalHistory, allergies, medications } = req.body;

    const updateData = {};
    if (medicalHistory) updateData.medicalHistory = medicalHistory;
    if (allergies) updateData.allergies = allergies;
    if (medications) updateData.medications = medications;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('medicalHistory allergies medications');

    res.json({
      message: 'Medical history updated successfully',
      medicalHistory: user.medicalHistory,
      allergies: user.allergies,
      medications: user.medications
    });
  } catch (error) {
    console.error('Update medical history error:', error);
    res.status(500).json({ message: 'Server error while updating medical history' });
  }
});

module.exports = router;
