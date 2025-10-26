const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const { verifyToken, requirePatient } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validation');

const router = express.Router();

// Initialize Razorpay (only if keys are provided)
let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET && 
    process.env.RAZORPAY_KEY_ID !== 'rzp_test_your_key_id_here') {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// @route   POST /api/payments/create-order
// @desc    Create Razorpay order for appointment payment
// @access  Private (Patient)
router.post('/create-order', verifyToken, requirePatient, async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(503).json({ 
        message: 'Payment service is not configured. Please contact administrator.' 
      });
    }

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

    // Create Razorpay order
    const options = {
      amount: appointment.payment.amount * 100, // Convert to paise
      currency: 'INR',
      receipt: `appointment_${appointmentId}`,
      notes: {
        appointmentId: appointmentId,
        patientId: req.user._id,
        doctorId: appointment.doctorId._id
      }
    };

    const order = await razorpay.orders.create(options);

    // Update appointment with Razorpay order ID
    appointment.payment.razorpayOrderId = order.id;
    await appointment.save();

    res.json({
      message: 'Order created successfully',
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt
      },
      key: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Server error while creating order' });
  }
});

// @route   POST /api/payments/verify
// @desc    Verify Razorpay payment
// @access  Private (Patient)
router.post('/verify', verifyToken, requirePatient, async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(503).json({ 
        message: 'Payment service is not configured. Please contact administrator.' 
      });
    }

    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      appointmentId 
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !appointmentId) {
      return res.status(400).json({ message: 'All payment details are required' });
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

    // Verify payment signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // Update appointment payment status
    appointment.payment = {
      ...appointment.payment,
      status: 'paid',
      method: 'card',
      transactionId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      paidAt: new Date()
    };

    // Confirm appointment
    if (appointment.status === 'pending') {
      appointment.status = 'confirmed';
    }

    await appointment.save();

    res.json({
      message: 'Payment verified and appointment confirmed successfully',
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

// @route   POST /api/payments/refund
// @desc    Process refund for cancelled appointment
// @access  Private
router.post('/refund', verifyToken, async (req, res) => {
  try {
    const { appointmentId, reason } = req.body;

    if (!appointmentId) {
      return res.status(400).json({ message: 'Appointment ID is required' });
    }

    // Find appointment
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check access permissions
    const isPatient = appointment.patientId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isPatient && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if payment was made
    if (appointment.payment.status !== 'paid') {
      return res.status(400).json({ message: 'No payment to refund' });
    }

    // Check if already refunded
    if (appointment.payment.status === 'refunded') {
      return res.status(400).json({ message: 'Payment already refunded' });
    }

    // Calculate refund amount
    const refundAmount = appointment.calculateRefund();

    if (refundAmount <= 0) {
      return res.status(400).json({ message: 'No refund available for this appointment' });
    }

    // Create Razorpay refund
    const refundOptions = {
      payment_id: appointment.payment.razorpayPaymentId,
      amount: refundAmount * 100, // Convert to paise
      notes: {
        reason: reason || 'Appointment cancellation',
        appointmentId: appointmentId
      }
    };

    const refund = await razorpay.payments.refund(appointment.payment.razorpayPaymentId, refundOptions);

    // Update appointment payment status
    appointment.payment.status = 'refunded';
    appointment.cancellation.refundStatus = 'processed';
    appointment.cancellation.refundAmount = refundAmount;

    await appointment.save();

    res.json({
      message: 'Refund processed successfully',
      refund: {
        id: refund.id,
        amount: refund.amount / 100, // Convert back to rupees
        status: refund.status,
        createdAt: refund.created_at
      }
    });
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({ message: 'Server error while processing refund' });
  }
});

// @route   GET /api/payments/history
// @desc    Get payment history for user
// @access  Private
router.get('/history', verifyToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

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
      // Admin can see all payments
    }

    const appointments = await Appointment.find(filter)
      .populate('patientId', 'firstName lastName email')
      .populate('doctorId', 'specialization')
      .select('appointmentDate appointmentTime payment status')
      .sort({ 'payment.paidAt': -1 })
      .skip(skip)
      .limit(limit);

    const total = await Appointment.countDocuments(filter);

    res.json({
      message: 'Payment history retrieved successfully',
      payments: appointments.map(apt => ({
        id: apt._id,
        appointmentDate: apt.appointmentDate,
        appointmentTime: apt.appointmentTime,
        patient: apt.patientId,
        doctor: apt.doctorId,
        payment: apt.payment,
        status: apt.status
      })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalPayments: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ message: 'Server error while fetching payment history' });
  }
});

// @route   GET /api/payments/stats
// @desc    Get payment statistics
// @access  Private (Admin/Doctor)
router.get('/stats', verifyToken, async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (doctor) {
        filter.doctorId = doctor._id;
      } else {
        return res.status(404).json({ message: 'Doctor profile not found' });
      }
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));

    const [
      totalRevenue,
      monthlyRevenue,
      weeklyRevenue,
      totalTransactions,
      monthlyTransactions,
      weeklyTransactions,
      pendingPayments,
      refundedPayments
    ] = await Promise.all([
      Appointment.aggregate([
        { $match: { ...filter, 'payment.status': 'paid' } },
        { $group: { _id: null, total: { $sum: '$payment.amount' } } }
      ]),
      Appointment.aggregate([
        { $match: { ...filter, 'payment.status': 'paid', 'payment.paidAt': { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$payment.amount' } } }
      ]),
      Appointment.aggregate([
        { $match: { ...filter, 'payment.status': 'paid', 'payment.paidAt': { $gte: startOfWeek } } },
        { $group: { _id: null, total: { $sum: '$payment.amount' } } }
      ]),
      Appointment.countDocuments({ ...filter, 'payment.status': 'paid' }),
      Appointment.countDocuments({ ...filter, 'payment.status': 'paid', 'payment.paidAt': { $gte: startOfMonth } }),
      Appointment.countDocuments({ ...filter, 'payment.status': 'paid', 'payment.paidAt': { $gte: startOfWeek } }),
      Appointment.countDocuments({ ...filter, 'payment.status': 'pending' }),
      Appointment.countDocuments({ ...filter, 'payment.status': 'refunded' })
    ]);

    res.json({
      message: 'Payment statistics retrieved successfully',
      stats: {
        revenue: {
          total: totalRevenue[0]?.total || 0,
          monthly: monthlyRevenue[0]?.total || 0,
          weekly: weeklyRevenue[0]?.total || 0
        },
        transactions: {
          total: totalTransactions,
          monthly: monthlyTransactions,
          weekly: weeklyTransactions,
          pending: pendingPayments,
          refunded: refundedPayments
        }
      }
    });
  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({ message: 'Server error while fetching payment statistics' });
  }
});

// @route   POST /api/payments/webhook
// @desc    Handle Razorpay webhook events
// @access  Public (Webhook)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const body = req.body;

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({ message: 'Invalid webhook signature' });
    }

    const event = JSON.parse(body);

    // Handle different webhook events
    switch (event.event) {
      case 'payment.captured':
        // Payment was successful
        console.log('Payment captured:', event.payload.payment.entity);
        break;
      
      case 'payment.failed':
        // Payment failed
        console.log('Payment failed:', event.payload.payment.entity);
        break;
      
      case 'refund.created':
        // Refund was created
        console.log('Refund created:', event.payload.refund.entity);
        break;
      
      default:
        console.log('Unhandled webhook event:', event.event);
    }

    res.json({ message: 'Webhook received successfully' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
});

module.exports = router;
