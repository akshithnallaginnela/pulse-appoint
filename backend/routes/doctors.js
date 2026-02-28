const express = require('express');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const { verifyToken, requireDoctor, optionalAuth } = require('../middleware/auth');
const { validateDoctorProfile, validateObjectId, validatePagination, validateSearch } = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/doctors
// @desc    Get all doctors with filtering and search
// @access  Public
router.get('/', validatePagination, validateSearch, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    const { search, specialization, sortBy = 'rating', sortOrder = 'desc' } = req.query;

    // Build filter object
    const filter = { isActive: true, isVerified: true };

    if (specialization && specialization !== 'all') {
      filter.specialization = specialization;
    }

    // Build search query
    let searchQuery = {};
    if (search) {
      searchQuery = {
        $or: [
          { specialization: { $regex: search, $options: 'i' } },
          { bio: { $regex: search, $options: 'i' } },
          { services: { $in: [new RegExp(search, 'i')] } }
        ]
      };
    }

    // Build sort object
    const sort = {};
    if (sortBy === 'rating') {
      sort['rating.average'] = sortOrder === 'desc' ? -1 : 1;
    } else if (sortBy === 'experience') {
      sort.experience = sortOrder === 'desc' ? -1 : 1;
    } else if (sortBy === 'fee') {
      sort.consultationFee = sortOrder === 'desc' ? -1 : 1;
    }

    const doctors = await Doctor.find({ ...filter, ...searchQuery })
      .populate('userId', 'firstName lastName email profileImage')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Doctor.countDocuments({ ...filter, ...searchQuery });

    res.json({
      message: 'Doctors retrieved successfully',
      doctors,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalDoctors: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Get doctors error:', error);
    res.status(500).json({ message: 'Server error while fetching doctors' });
  }
});

// @route   GET /api/doctors/specializations
// @desc    Get all available specializations
// @access  Public
router.get('/specializations', async (req, res) => {
  try {
    const specializations = await Doctor.distinct('specialization', { isActive: true, isVerified: true });

    res.json({
      message: 'Specializations retrieved successfully',
      specializations
    });
  } catch (error) {
    console.error('Get specializations error:', error);
    res.status(500).json({ message: 'Server error while fetching specializations' });
  }
});

// NOTE: /:id, /:id/availability, /:id/reviews routes moved AFTER all named routes
// to prevent Express from matching "appointments", "profile", etc. as :id parameter.

// @route   GET /api/doctors/profile/me
// @desc    Get current doctor's profile
// @access  Private (Doctor)
router.get('/profile/me', verifyToken, requireDoctor, async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ userId: req.user._id })
      .populate('userId', 'firstName lastName email phone profileImage');

    res.json({
      message: 'Doctor profile retrieved successfully',
      doctor
    });
  } catch (error) {
    console.error('Get doctor profile error:', error);
    res.status(500).json({ message: 'Server error while fetching doctor profile' });
  }
});

// @route   PUT /api/doctors/profile/me
// @desc    Update doctor's profile
// @access  Private (Doctor)
router.put('/profile/me', verifyToken, requireDoctor, validateDoctorProfile, async (req, res) => {
  try {
    const {
      specialization,
      experience,
      education,
      certifications,
      hospitalAffiliations,
      consultationFee,
      consultationDuration,
      languages,
      bio,
      services,
      awards,
      publications,
      availability
    } = req.body;

    const updateData = {};

    if (specialization) updateData.specialization = specialization;
    if (experience) updateData.experience = experience;
    if (education) updateData.education = education;
    if (certifications) updateData.certifications = certifications;
    if (hospitalAffiliations) updateData.hospitalAffiliations = hospitalAffiliations;
    if (consultationFee) updateData.consultationFee = consultationFee;
    if (consultationDuration) updateData.consultationDuration = consultationDuration;
    if (languages) updateData.languages = languages;
    if (bio) updateData.bio = bio;
    if (services) updateData.services = services;
    if (awards) updateData.awards = awards;
    if (publications) updateData.publications = publications;
    if (availability) updateData.availability = availability;

    // Mark profile as completed if all required fields are filled
    const requiredFields = ['specialization', 'experience', 'consultationFee', 'bio'];
    const hasAllRequiredFields = requiredFields.every(field => updateData[field] || req.doctor[field]);

    if (hasAllRequiredFields) {
      updateData.profileCompleted = true;
    }

    const doctor = await Doctor.findByIdAndUpdate(
      req.doctor._id,
      updateData,
      { new: true, runValidators: true }
    ).populate('userId', 'firstName lastName email phone profileImage');

    res.json({
      message: 'Doctor profile updated successfully',
      doctor
    });
  } catch (error) {
    console.error('Update doctor profile error:', error);
    res.status(500).json({ message: 'Server error while updating doctor profile' });
  }
});

// @route   GET /api/doctors/appointments/me
// @desc    Get doctor's appointments
// @access  Private (Doctor)
router.get('/appointments/me', verifyToken, requireDoctor, validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { status, date } = req.query;

    const filter = { doctorId: req.doctor._id };

    if (status) {
      filter.status = status;
    }

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      filter.appointmentDate = { $gte: startDate, $lt: endDate };
    }

    const appointments = await Appointment.find(filter)
      .populate('patientId', 'firstName lastName email phone')
      .sort({ appointmentDate: -1, appointmentTime: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Appointment.countDocuments(filter);

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
    console.error('Get doctor appointments error:', error);
    res.status(500).json({ message: 'Server error while fetching appointments' });
  }
});

// @route   PUT /api/doctors/appointments/:id/status
// @desc    Update appointment status
// @access  Private (Doctor)
router.put('/appointments/:id/status', verifyToken, requireDoctor, validateObjectId('id'), async (req, res) => {
  try {
    const { status, notes } = req.body;

    if (!status || !['confirmed', 'completed', 'cancelled', 'no-show'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if doctor owns this appointment
    if (appointment.doctorId.toString() !== req.doctor._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update appointment
    appointment.status = status;
    if (notes) {
      appointment.doctorNotes = notes;
    }

    // If cancelling, add cancellation details
    if (status === 'cancelled') {
      appointment.cancellation = {
        cancelledBy: 'doctor',
        cancelledAt: new Date(),
        reason: notes || 'Cancelled by doctor'
      };
    }

    await appointment.save();

    res.json({
      message: 'Appointment status updated successfully',
      appointment
    });
  } catch (error) {
    console.error('Update appointment status error:', error);
    res.status(500).json({ message: 'Server error while updating appointment status' });
  }
});

// @route   PUT /api/doctors/appointments/:id/diagnosis
// @desc    Add diagnosis and prescription to appointment
// @access  Private (Doctor)
router.put('/appointments/:id/diagnosis', verifyToken, requireDoctor, validateObjectId('id'), async (req, res) => {
  try {
    const { diagnosis, prescription, followUpRequired, followUpDate, followUpNotes } = req.body;

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if doctor owns this appointment
    if (appointment.doctorId.toString() !== req.doctor._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update appointment
    if (diagnosis) appointment.diagnosis = diagnosis;
    if (prescription) appointment.prescription = prescription;
    if (followUpRequired !== undefined) appointment.followUpRequired = followUpRequired;
    if (followUpDate) appointment.followUpDate = followUpDate;
    if (followUpNotes) appointment.followUpNotes = followUpNotes;

    await appointment.save();

    res.json({
      message: 'Diagnosis updated successfully',
      appointment
    });
  } catch (error) {
    console.error('Update diagnosis error:', error);
    res.status(500).json({ message: 'Server error while updating diagnosis' });
  }
});

// @route   GET /api/doctors/appointments/today
// @desc    Get doctor's appointments for today
// @access  Private (Doctor)
router.get('/appointments/today', verifyToken, requireDoctor, async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ userId: req.user._id });

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointments = await Appointment.find({
      doctorId: doctor._id,
      appointmentDate: {
        $gte: today,
        $lt: tomorrow
      }
    })
      .populate('patientId', 'firstName lastName email phone')
      .sort({ appointmentTime: 1 });

    res.json({
      message: 'Today\'s appointments retrieved successfully',
      appointments
    });
  } catch (error) {
    console.error('Get today appointments error:', error);
    res.status(500).json({ message: 'Server error while fetching today\'s appointments' });
  }
});

// @route   GET /api/doctors/appointments
// @desc    Get all doctor's appointments
// @access  Private (Doctor)
router.get('/appointments', verifyToken, requireDoctor, async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ userId: req.user._id });

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }

    const { status } = req.query;
    const filter = { doctorId: doctor._id };

    if (status && status !== 'all') {
      filter.status = status;
    }

    const appointments = await Appointment.find(filter)
      .populate('patientId', 'firstName lastName email phone')
      .sort({ appointmentDate: -1, appointmentTime: -1 });

    res.json({
      message: 'Appointments retrieved successfully',
      appointments
    });
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ message: 'Server error while fetching appointments' });
  }
});

// @route   GET /api/doctors/dashboard/stats
// @desc    Get doctor's dashboard statistics
// @access  Private (Doctor)
router.get('/dashboard/stats', verifyToken, requireDoctor, async (req, res) => {
  try {
    const doctorId = req.doctor._id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));

    const [
      totalAppointments,
      monthlyAppointments,
      weeklyAppointments,
      completedAppointments,
      pendingAppointments,
      cancelledAppointments,
      totalRevenue,
      monthlyRevenue,
      averageRating,
      totalReviews
    ] = await Promise.all([
      Appointment.countDocuments({ doctorId }),
      Appointment.countDocuments({ doctorId, createdAt: { $gte: startOfMonth } }),
      Appointment.countDocuments({ doctorId, createdAt: { $gte: startOfWeek } }),
      Appointment.countDocuments({ doctorId, status: 'completed' }),
      Appointment.countDocuments({ doctorId, status: 'pending' }),
      Appointment.countDocuments({ doctorId, status: 'cancelled' }),
      Appointment.aggregate([
        { $match: { doctorId, 'payment.status': 'paid' } },
        { $group: { _id: null, total: { $sum: '$payment.amount' } } }
      ]),
      Appointment.aggregate([
        { $match: { doctorId, 'payment.status': 'paid', createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$payment.amount' } } }
      ]),
      Appointment.aggregate([
        { $match: { doctorId, 'rating.score': { $exists: true } } },
        { $group: { _id: null, average: { $avg: '$rating.score' } } }
      ]),
      Appointment.countDocuments({ doctorId, 'rating.score': { $exists: true } })
    ]);

    res.json({
      message: 'Dashboard stats retrieved successfully',
      stats: {
        appointments: {
          total: totalAppointments,
          monthly: monthlyAppointments,
          weekly: weeklyAppointments,
          completed: completedAppointments,
          pending: pendingAppointments,
          cancelled: cancelledAppointments
        },
        revenue: {
          total: totalRevenue[0]?.total || 0,
          monthly: monthlyRevenue[0]?.total || 0
        },
        rating: {
          average: averageRating[0]?.average || 0,
          totalReviews: totalReviews
        }
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Server error while fetching dashboard stats' });
  }
});

// =====================================================
// PARAMETERIZED ROUTES - Must be LAST to avoid matching
// named segments like "appointments", "profile" as :id
// =====================================================

// @route   GET /api/doctors/:id
// @desc    Get doctor by ID
// @access  Public
router.get('/:id', validateObjectId('id'), async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id)
      .populate('userId', 'firstName lastName email phone profileImage');

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    if (!doctor.isActive || !doctor.isVerified) {
      return res.status(404).json({ message: 'Doctor profile not available' });
    }

    res.json({
      message: 'Doctor retrieved successfully',
      doctor
    });
  } catch (error) {
    console.error('Get doctor error:', error);
    res.status(500).json({ message: 'Server error while fetching doctor' });
  }
});

// @route   GET /api/doctors/:id/availability
// @desc    Get doctor's availability for a specific date
// @access  Public
router.get('/:id/availability', validateObjectId('id'), async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const appointmentDate = new Date(date);
    const dayName = appointmentDate.toLocaleDateString('en-US', { weekday: 'lowercase' });

    // Get available time slots
    const availableSlots = doctor.getAvailableSlots(dayName, date);

    // Get booked appointments for this date
    const bookedAppointments = await Appointment.find({
      doctorId: doctor._id,
      appointmentDate: appointmentDate,
      status: { $in: ['confirmed', 'pending'] }
    }).select('appointmentTime');

    const bookedTimes = bookedAppointments.map(apt => apt.appointmentTime);

    // Filter out booked slots
    const freeSlots = availableSlots.filter(slot => !bookedTimes.includes(slot));

    res.json({
      message: 'Availability retrieved successfully',
      availability: {
        date: appointmentDate,
        dayName,
        availableSlots: freeSlots,
        totalSlots: availableSlots.length,
        bookedSlots: bookedTimes.length
      }
    });
  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({ message: 'Server error while fetching availability' });
  }
});

// @route   GET /api/doctors/:id/reviews
// @desc    Get doctor's reviews
// @access  Public
router.get('/:id/reviews', validateObjectId('id'), validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const reviews = await Appointment.find({
      doctorId: req.params.id,
      'rating.score': { $exists: true }
    })
      .populate('patientId', 'firstName lastName')
      .select('rating appointmentDate')
      .sort({ 'rating.ratedAt': -1 })
      .skip(skip)
      .limit(limit);

    const total = await Appointment.countDocuments({
      doctorId: req.params.id,
      'rating.score': { $exists: true }
    });

    res.json({
      message: 'Reviews retrieved successfully',
      reviews,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalReviews: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ message: 'Server error while fetching reviews' });
  }
});

module.exports = router;
