const express = require('express');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const { verifyToken, requirePatient } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validation');

const router = express.Router();

// @route   POST /api/payments/create-order
// @desc    Skip payment and directly confirm appointment
// @access  Private (Patient)
router.post('/create-order', verifyToken, requirePatient, async (req, res) => {
  try {
    const { appointmentId } = req.body;

    if (!appointmentId) {
      return res.status(400).json({ message: 'Appointment ID is required' });
    }

    // Find appointment
    const appointment = await Appointment.findById(appointmentId)
      .populate('doctorId', 'consultationFee');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if user owns this appointment
    if (appointment.patientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if payment is already done
    if (appointment.payment.status === 'paid') {
      return res.status(400).json({ message: 'Payment already completed' });
    }

    // Skip payment and directly confirm appointment
    appointment.payment = {
      ...appointment.payment,
      status: 'paid',
      method: 'free',
      transactionId: `free_${Date.now()}`,
      paidAt: new Date()
    };

    // Confirm appointment
    if (appointment.status === 'pending') {
      appointment.status = 'confirmed';
    }

    await appointment.save();

    res.json({
      message: 'Appointment confirmed successfully (Payment skipped)',
      order: {
        id: `free_order_${appointmentId}`,
        amount: appointment.payment.amount,
        currency: 'INR',
        receipt: `appointment_${appointmentId}`
      },
      appointment: {
        id: appointment._id,
        status: appointment.status,
        appointmentDate: appointment.appointmentDate,
        appointmentTime: appointment.appointmentTime
      }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Server error while creating order' });
  }
});

// @route   POST /api/payments/verify
// @desc    Skip payment verification (already confirmed)
// @access  Private (Patient)
router.post('/verify', verifyToken, requirePatient, async (req, res) => {
  try {
    const { appointmentId } = req.body;

    if (!appointmentId) {
      return res.status(400).json({ message: 'Appointment ID is required' });
    }

    // Find appointment
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if user owns this appointment
    if (appointment.patientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      message: 'Payment already verified (Payment skipped)',
      payment: {
        status: appointment.payment.status,
        amount: appointment.payment.amount,
        transactionId: appointment.payment.transactionId,
        paidAt: appointment.payment.paidAt
      },
      appointment: {
        id: appointment._id,
        status: appointment.status,
        appointmentDate: appointment.appointmentDate,
        appointmentTime: appointment.appointmentTime
      }
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ message: 'Server error while verifying payment' });
  }
});

module.exports = router;
