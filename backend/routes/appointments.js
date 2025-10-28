const express = require('express');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const { verifyToken, requirePatient, requireDoctor } = require('../middleware/auth');
const { validateAppointmentBooking, validateObjectId, validatePagination } = require('../middleware/validation');

const router = express.Router();

// @route   POST /api/appointments
// @desc    Book a new appointment
// @access  Private (Patient)
router.post('/', verifyToken, requirePatient, validateAppointmentBooking, async (req, res) => {
  try {
    const {
      doctorId,
      appointmentDate,
      appointmentTime,
      reason,
      consultationType = 'in-person',
      symptoms = [],
      medicalHistory,
      currentMedications = [],
      allergies = []
    } = req.body;

    // Check if doctor exists and is available
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    if (!doctor.isActive || !doctor.isVerified) {
      return res.status(400).json({ message: 'Doctor is not available for appointments' });
    }

    // Check if doctor is available at the requested time
    const appointmentDateTime = new Date(appointmentDate);
    // Use 'long' for weekday and convert to lowercase
    const dayName = appointmentDateTime.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    if (!doctor.isAvailableAt(dayName, appointmentTime)) {
      return res.status(400).json({ message: 'Doctor is not available at the requested time' });
    }

    // Check if slot is already booked
    const existingAppointment = await Appointment.findOne({
      doctorId,
      appointmentDate: appointmentDateTime,
      appointmentTime,
      status: { $nin: ['cancelled'] }
    });

    if (existingAppointment) {
      return res.status(400).json({ message: 'This time slot is already booked' });
    }

    // Create new appointment
    const appointment = new Appointment({
      patientId: req.user._id,
      doctorId,
      appointmentDate: appointmentDateTime,
      appointmentTime,
      duration: doctor.consultationDuration,
      reason,
      consultationType,
      symptoms,
      medicalHistory,
      currentMedications,
      allergies,
      payment: {
        amount: doctor.consultationFee,
        status: 'pending'
      }
    });

    await appointment.save();

    // Populate the appointment with doctor and patient details
    await appointment.populate([
      { path: 'doctorId', select: 'specialization consultationFee' },
      { path: 'patientId', select: 'firstName lastName email phone' }
    ]);

    res.status(201).json({
      message: 'Appointment booked successfully',
      appointment
    });
  } catch (error) {
    console.error('Book appointment error:', error);
    res.status(500).json({ message: 'Server error while booking appointment' });
  }
});

// @route   GET /api/appointments
// @desc    Get appointments (filtered by user role)
// @access  Private
router.get('/', verifyToken, validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { status, date, doctorId, patientId } = req.query;

    let filter = {};

    // Filter based on user role
    if (req.user.role === 'patient') {
      filter.patientId = req.user._id;
    } else if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (doctor) {
        filter.doctorId = doctor._id;
      } else {
        return res.status(404).json({ message: 'Doctor profile not found' });
      }
    } else if (req.user.role === 'admin') {
      // Admin can see all appointments
      if (doctorId) filter.doctorId = doctorId;
      if (patientId) filter.patientId = patientId;
    }

    // Additional filters
    if (status) filter.status = status;
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

// @route   GET /api/appointments/:id
// @desc    Get specific appointment
// @access  Private
router.get('/:id', verifyToken, validateObjectId('id'), async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('patientId', 'firstName lastName email phone')
      .populate('doctorId', 'specialization consultationFee');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check access permissions
    const hasAccess = 
      req.user.role === 'admin' ||
      appointment.patientId._id.toString() === req.user._id.toString() ||
      (req.user.role === 'doctor' && appointment.doctorId._id.toString() === req.doctor?._id.toString());

    if (!hasAccess) {
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

// @route   PUT /api/appointments/:id/confirm
// @desc    Confirm an appointment
// @access  Private (Doctor)
router.put('/:id/confirm', verifyToken, requireDoctor, validateObjectId('id'), async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if doctor owns this appointment
    if (appointment.doctorId.toString() !== req.doctor._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (appointment.status !== 'pending') {
      return res.status(400).json({ message: 'Appointment is not in pending status' });
    }

    appointment.status = 'confirmed';
    await appointment.save();

    res.json({
      message: 'Appointment confirmed successfully',
      appointment
    });
  } catch (error) {
    console.error('Confirm appointment error:', error);
    res.status(500).json({ message: 'Server error while confirming appointment' });
  }
});

// @route   PUT /api/appointments/:id/cancel
// @desc    Cancel an appointment
// @access  Private
router.put('/:id/cancel', verifyToken, validateObjectId('id'), async (req, res) => {
  try {
    const { reason } = req.body;

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check access permissions
    const isPatient = appointment.patientId.toString() === req.user._id.toString();
    const isDoctor = req.user.role === 'doctor' && appointment.doctorId.toString() === req.doctor?._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isPatient && !isDoctor && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (appointment.status === 'cancelled') {
      return res.status(400).json({ message: 'Appointment is already cancelled' });
    }

    if (appointment.status === 'completed') {
      return res.status(400).json({ message: 'Cannot cancel completed appointment' });
    }

    // Calculate refund amount
    const refundAmount = appointment.calculateRefund();

    // Update appointment
    appointment.status = 'cancelled';
    appointment.cancellation = {
      cancelledBy: isPatient ? 'patient' : isDoctor ? 'doctor' : 'admin',
      cancelledAt: new Date(),
      reason: reason || 'Cancelled',
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

// @route   PUT /api/appointments/:id/reschedule
// @desc    Reschedule an appointment
// @access  Private
router.put('/:id/reschedule', verifyToken, validateObjectId('id'), async (req, res) => {
  try {
    const { newDate, newTime, reason } = req.body;

    if (!newDate || !newTime) {
      return res.status(400).json({ message: 'New date and time are required' });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check access permissions
    const isPatient = appointment.patientId.toString() === req.user._id.toString();
    const isDoctor = req.user.role === 'doctor' && appointment.doctorId.toString() === req.doctor?._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isPatient && !isDoctor && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!appointment.canBeRescheduled()) {
      return res.status(400).json({ 
        message: 'Appointment cannot be rescheduled. Must be rescheduled at least 2 hours before the appointment time.' 
      });
    }

    // Check if new slot is available
    const doctor = await Doctor.findById(appointment.doctorId);
    const newAppointmentDate = new Date(newDate);
    const dayName = newAppointmentDate.toLocaleDateString('en-US', { weekday: 'lowercase' });
    
    if (!doctor.isAvailableAt(dayName, newTime)) {
      return res.status(400).json({ message: 'Doctor is not available at the requested time' });
    }

    // Check if new slot is already booked
    const existingAppointment = await Appointment.findOne({
      doctorId: appointment.doctorId,
      appointmentDate: newAppointmentDate,
      appointmentTime: newTime,
      status: { $nin: ['cancelled'] },
      _id: { $ne: appointment._id }
    });

    if (existingAppointment) {
      return res.status(400).json({ message: 'This time slot is already booked' });
    }

    // Update appointment
    appointment.appointmentDate = newAppointmentDate;
    appointment.appointmentTime = newTime;
    appointment.status = 'rescheduled';
    
    if (reason) {
      appointment.patientNotes = reason;
    }

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

// @route   PUT /api/appointments/:id/complete
// @desc    Mark appointment as completed
// @access  Private (Doctor)
router.put('/:id/complete', verifyToken, requireDoctor, validateObjectId('id'), async (req, res) => {
  try {
    const { diagnosis, prescription, followUpRequired, followUpDate, followUpNotes, doctorNotes } = req.body;

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if doctor owns this appointment
    if (appointment.doctorId.toString() !== req.doctor._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (appointment.status !== 'confirmed') {
      return res.status(400).json({ message: 'Only confirmed appointments can be completed' });
    }

    // Update appointment
    appointment.status = 'completed';
    if (diagnosis) appointment.diagnosis = diagnosis;
    if (prescription) appointment.prescription = prescription;
    if (followUpRequired !== undefined) appointment.followUpRequired = followUpRequired;
    if (followUpDate) appointment.followUpDate = followUpDate;
    if (followUpNotes) appointment.followUpNotes = followUpNotes;
    if (doctorNotes) appointment.doctorNotes = doctorNotes;

    await appointment.save();

    res.json({
      message: 'Appointment completed successfully',
      appointment
    });
  } catch (error) {
    console.error('Complete appointment error:', error);
    res.status(500).json({ message: 'Server error while completing appointment' });
  }
});

// @route   GET /api/appointments/upcoming/me
// @desc    Get upcoming appointments for current user
// @access  Private
router.get('/upcoming/me', verifyToken, async (req, res) => {
  try {
    const now = new Date();
    let filter = { appointmentDate: { $gte: now }, status: { $in: ['confirmed', 'pending'] } };

    // Filter based on user role
    if (req.user.role === 'patient') {
      filter.patientId = req.user._id;
    } else if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (doctor) {
        filter.doctorId = doctor._id;
      } else {
        return res.status(404).json({ message: 'Doctor profile not found' });
      }
    }

    const appointments = await Appointment.find(filter)
      .populate('patientId', 'firstName lastName email phone')
      .populate('doctorId', 'specialization consultationFee')
      .sort({ appointmentDate: 1, appointmentTime: 1 })
      .limit(5);

    res.json({
      message: 'Upcoming appointments retrieved successfully',
      appointments
    });
  } catch (error) {
    console.error('Get upcoming appointments error:', error);
    res.status(500).json({ message: 'Server error while fetching upcoming appointments' });
  }
});

// @route   GET /api/appointments/today/me
// @desc    Get today's appointments for current user
// @access  Private
router.get('/today/me', verifyToken, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let filter = { 
      appointmentDate: { $gte: today, $lt: tomorrow },
      status: { $in: ['confirmed', 'pending'] }
    };

    // Filter based on user role
    if (req.user.role === 'patient') {
      filter.patientId = req.user._id;
    } else if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (doctor) {
        filter.doctorId = doctor._id;
      } else {
        return res.status(404).json({ message: 'Doctor profile not found' });
      }
    }

    const appointments = await Appointment.find(filter)
      .populate('patientId', 'firstName lastName email phone')
      .populate('doctorId', 'specialization consultationFee')
      .sort({ appointmentTime: 1 });

    res.json({
      message: 'Today\'s appointments retrieved successfully',
      appointments
    });
  } catch (error) {
    console.error('Get today\'s appointments error:', error);
    res.status(500).json({ message: 'Server error while fetching today\'s appointments' });
  }
});

module.exports = router;
