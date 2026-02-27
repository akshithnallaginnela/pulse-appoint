const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { validateObjectId, validatePagination, validateSearch } = require('../middleware/validation');

const router = express.Router();

// @route   POST /api/admin/create-doctor
// @desc    Create a new doctor account (admin only)
// @access  Private (Admin)
router.post('/create-doctor', verifyToken, requireAdmin, async (req, res) => {
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

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !phone || !dateOfBirth || !gender || !licenseNumber || !specialization) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'A user already exists with this email' });
    }

    // Check if license number already exists
    const existingDoctor = await Doctor.findOne({ licenseNumber });
    if (existingDoctor) {
      return res.status(400).json({ message: 'A doctor with this license number already exists' });
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

    // Create doctor profile (auto-verified since created by admin)
    const doctor = new Doctor({
      userId: user._id,
      licenseNumber,
      specialization,
      experience: experience || 0,
      consultationFee: consultationFee || 500,
      isVerified: true,
      isActive: true
    });

    await doctor.save();

    res.status(201).json({
      message: 'Doctor account created successfully',
      doctor: {
        id: doctor._id,
        userId: user._id,
        name: `Dr. ${firstName} ${lastName}`,
        email,
        specialization,
        licenseNumber,
        isVerified: true
      }
    });
  } catch (error) {
    console.error('Create doctor error:', error);
    if (error && error.code === 11000) {
      const field = error.keyPattern?.email ? 'email' : error.keyPattern?.licenseNumber ? 'license number' : 'field';
      return res.status(400).json({ message: `A user already exists with this ${field}` });
    }
    if (error && error.name === 'ValidationError') {
      const details = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: 'Validation failed', details });
    }
    res.status(500).json({ message: 'Server error while creating doctor account' });
  }
});

// @route   GET /api/admin/dashboard/stats
// @desc    Get admin dashboard statistics
// @access  Private (Admin)
router.get('/dashboard/stats', verifyToken, requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));

    const [
      totalUsers,
      totalDoctors,
      totalPatients,
      totalAppointments,
      monthlyAppointments,
      weeklyAppointments,
      pendingAppointments,
      completedAppointments,
      cancelledAppointments,
      totalRevenue,
      monthlyRevenue,
      weeklyRevenue,
      verifiedDoctors,
      unverifiedDoctors,
      activeUsers,
      inactiveUsers
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'doctor' }),
      User.countDocuments({ role: 'patient' }),
      Appointment.countDocuments(),
      Appointment.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Appointment.countDocuments({ createdAt: { $gte: startOfWeek } }),
      Appointment.countDocuments({ status: 'pending' }),
      Appointment.countDocuments({ status: 'completed' }),
      Appointment.countDocuments({ status: 'cancelled' }),
      Appointment.aggregate([
        { $match: { 'payment.status': 'paid' } },
        { $group: { _id: null, total: { $sum: '$payment.amount' } } }
      ]),
      Appointment.aggregate([
        { $match: { 'payment.status': 'paid', createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$payment.amount' } } }
      ]),
      Appointment.aggregate([
        { $match: { 'payment.status': 'paid', createdAt: { $gte: startOfWeek } } },
        { $group: { _id: null, total: { $sum: '$payment.amount' } } }
      ]),
      Doctor.countDocuments({ isVerified: true }),
      Doctor.countDocuments({ isVerified: false }),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: false })
    ]);

    res.json({
      message: 'Dashboard statistics retrieved successfully',
      stats: {
        users: {
          total: totalUsers,
          patients: totalPatients,
          doctors: totalDoctors,
          active: activeUsers,
          inactive: inactiveUsers
        },
        doctors: {
          total: totalDoctors,
          verified: verifiedDoctors,
          unverified: unverifiedDoctors
        },
        appointments: {
          total: totalAppointments,
          monthly: monthlyAppointments,
          weekly: weeklyAppointments,
          pending: pendingAppointments,
          completed: completedAppointments,
          cancelled: cancelledAppointments
        },
        revenue: {
          total: totalRevenue[0]?.total || 0,
          monthly: monthlyRevenue[0]?.total || 0,
          weekly: weeklyRevenue[0]?.total || 0
        }
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Server error while fetching dashboard statistics' });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users with filtering
// @access  Private (Admin)
router.get('/users', verifyToken, requireAdmin, validatePagination, validateSearch, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { search, role, isActive } = req.query;

    // Build filter object
    const filter = {};
    
    if (role) {
      filter.role = role;
    }
    
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    // Build search query
    let searchQuery = {};
    if (search) {
      searchQuery = {
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const users = await User.find({ ...filter, ...searchQuery })
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments({ ...filter, ...searchQuery });

    res.json({
      message: 'Users retrieved successfully',
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error while fetching users' });
  }
});

// @route   GET /api/admin/users/:id
// @desc    Get specific user details
// @access  Private (Admin)
router.get('/users/:id', verifyToken, requireAdmin, validateObjectId('id'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get doctor profile if user is a doctor
    let doctorProfile = null;
    if (user.role === 'doctor') {
      doctorProfile = await Doctor.findOne({ userId: user._id });
    }

    res.json({
      message: 'User retrieved successfully',
      user,
      doctorProfile
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error while fetching user' });
  }
});

// @route   PUT /api/admin/users/:id/status
// @desc    Update user status (active/inactive)
// @access  Private (Admin)
router.put('/users/:id/status', verifyToken, requireAdmin, validateObjectId('id'), async (req, res) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ message: 'isActive must be a boolean value' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ message: 'Server error while updating user status' });
  }
});

// @route   GET /api/admin/doctors
// @desc    Get all doctors with filtering
// @access  Private (Admin)
router.get('/doctors', verifyToken, requireAdmin, validatePagination, validateSearch, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { search, specialization, isVerified, isActive } = req.query;

    // Build filter object
    const filter = {};
    
    if (specialization) {
      filter.specialization = specialization;
    }
    
    if (isVerified !== undefined) {
      filter.isVerified = isVerified === 'true';
    }
    
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    // Build search query
    let searchQuery = {};
    if (search) {
      searchQuery = {
        $or: [
          { specialization: { $regex: search, $options: 'i' } },
          { bio: { $regex: search, $options: 'i' } },
          { licenseNumber: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const doctors = await Doctor.find({ ...filter, ...searchQuery })
      .populate('userId', 'firstName lastName email phone isActive')
      .sort({ createdAt: -1 })
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

// @route   PUT /api/admin/doctors/:id/verify
// @desc    Verify or unverify a doctor
// @access  Private (Admin)
router.put('/doctors/:id/verify', verifyToken, requireAdmin, validateObjectId('id'), async (req, res) => {
  try {
    const { isVerified } = req.body;

    if (typeof isVerified !== 'boolean') {
      return res.status(400).json({ message: 'isVerified must be a boolean value' });
    }

    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { isVerified },
      { new: true, runValidators: true }
    ).populate('userId', 'firstName lastName email phone');

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    res.json({
      message: `Doctor ${isVerified ? 'verified' : 'unverified'} successfully`,
      doctor
    });
  } catch (error) {
    console.error('Update doctor verification error:', error);
    res.status(500).json({ message: 'Server error while updating doctor verification' });
  }
});

// @route   GET /api/admin/appointments
// @desc    Get all appointments with filtering
// @access  Private (Admin)
router.get('/appointments', verifyToken, requireAdmin, validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { status, doctorId, patientId, date } = req.query;

    // Build filter object
    const filter = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (doctorId) {
      filter.doctorId = doctorId;
    }
    
    if (patientId) {
      filter.patientId = patientId;
    }
    
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      filter.appointmentDate = { $gte: startDate, $lt: endDate };
    }

    const appointments = await Appointment.find(filter)
      .populate('patientId', 'firstName lastName email phone')
      .populate('doctorId', 'specialization consultationFee')
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
    console.error('Get appointments error:', error);
    res.status(500).json({ message: 'Server error while fetching appointments' });
  }
});

// @route   PUT /api/admin/appointments/:id/status
// @desc    Update appointment status
// @access  Private (Admin)
router.put('/appointments/:id/status', verifyToken, requireAdmin, validateObjectId('id'), async (req, res) => {
  try {
    const { status, reason } = req.body;

    if (!status || !['pending', 'confirmed', 'completed', 'cancelled', 'rescheduled', 'no-show'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Update appointment
    appointment.status = status;
    
    if (status === 'cancelled' && reason) {
      appointment.cancellation = {
        cancelledBy: 'admin',
        cancelledAt: new Date(),
        reason: reason
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

// @route   GET /api/admin/reports/revenue
// @desc    Get revenue reports
// @access  Private (Admin)
router.get('/reports/revenue', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;

    let dateFilter = {};
    
    if (startDate && endDate) {
      dateFilter = {
        'payment.paidAt': {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      const now = new Date();
      switch (period) {
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateFilter = { 'payment.paidAt': { $gte: weekAgo } };
          break;
        case 'month':
          const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          dateFilter = { 'payment.paidAt': { $gte: monthAgo } };
          break;
        case 'year':
          const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          dateFilter = { 'payment.paidAt': { $gte: yearAgo } };
          break;
      }
    }

    const revenueData = await Appointment.aggregate([
      { $match: { 'payment.status': 'paid', ...dateFilter } },
      {
        $group: {
          _id: {
            year: { $year: '$payment.paidAt' },
            month: { $month: '$payment.paidAt' },
            day: { $dayOfMonth: '$payment.paidAt' }
          },
          totalRevenue: { $sum: '$payment.amount' },
          totalTransactions: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    const totalRevenue = await Appointment.aggregate([
      { $match: { 'payment.status': 'paid', ...dateFilter } },
      { $group: { _id: null, total: { $sum: '$payment.amount' } } }
    ]);

    res.json({
      message: 'Revenue report retrieved successfully',
      report: {
        period,
        totalRevenue: totalRevenue[0]?.total || 0,
        revenueData
      }
    });
  } catch (error) {
    console.error('Get revenue report error:', error);
    res.status(500).json({ message: 'Server error while fetching revenue report' });
  }
});

// @route   GET /api/admin/reports/appointments
// @desc    Get appointment reports
// @access  Private (Admin)
router.get('/reports/appointments', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;

    let dateFilter = {};
    
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      const now = new Date();
      switch (period) {
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateFilter = { createdAt: { $gte: weekAgo } };
          break;
        case 'month':
          const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          dateFilter = { createdAt: { $gte: monthAgo } };
          break;
        case 'year':
          const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          dateFilter = { createdAt: { $gte: yearAgo } };
          break;
      }
    }

    const appointmentData = await Appointment.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalAppointments = await Appointment.countDocuments(dateFilter);

    res.json({
      message: 'Appointment report retrieved successfully',
      report: {
        period,
        totalAppointments,
        appointmentData
      }
    });
  } catch (error) {
    console.error('Get appointment report error:', error);
    res.status(500).json({ message: 'Server error while fetching appointment report' });
  }
});

module.exports = router;
