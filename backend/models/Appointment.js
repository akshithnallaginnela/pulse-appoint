const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  appointmentDate: {
    type: Date,
    required: [true, 'Appointment date is required']
  },
  appointmentTime: {
    type: String,
    required: [true, 'Appointment time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time format (HH:MM)']
  },
  duration: {
    type: Number,
    default: 30, // in minutes
    min: [15, 'Minimum duration is 15 minutes'],
    max: [120, 'Maximum duration is 120 minutes']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled', 'rescheduled', 'no-show'],
    default: 'pending'
  },
  consultationType: {
    type: String,
    enum: ['in-person', 'video-call', 'phone-call'],
    default: 'in-person'
  },
  reason: {
    type: String,
    required: [true, 'Reason for appointment is required'],
    maxlength: [500, 'Reason cannot exceed 500 characters']
  },
  symptoms: [String],
  medicalHistory: {
    type: String,
    maxlength: [1000, 'Medical history cannot exceed 1000 characters']
  },
  currentMedications: [String],
  allergies: [String],
  vitalSigns: {
    bloodPressure: String,
    heartRate: String,
    temperature: String,
    weight: String,
    height: String,
    oxygenSaturation: String
  },
  diagnosis: {
    type: String,
    maxlength: [1000, 'Diagnosis cannot exceed 1000 characters']
  },
  prescription: [{
    medication: String,
    dosage: String,
    frequency: String,
    duration: String,
    instructions: String
  }],
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpDate: Date,
  followUpNotes: String,
  doctorNotes: {
    type: String,
    maxlength: [2000, 'Doctor notes cannot exceed 2000 characters']
  },
  patientNotes: {
    type: String,
    maxlength: [1000, 'Patient notes cannot exceed 1000 characters']
  },
  payment: {
    amount: {
      type: Number,
      required: true,
      min: [0, 'Payment amount cannot be negative']
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending'
    },
    method: {
      type: String,
      enum: ['cash', 'card', 'upi', 'netbanking', 'wallet'],
      default: 'card'
    },
    transactionId: String,
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    paidAt: Date
  },
  cancellation: {
    cancelledBy: {
      type: String,
      enum: ['patient', 'doctor', 'admin', 'system']
    },
    cancelledAt: Date,
    reason: String,
    refundAmount: Number,
    refundStatus: {
      type: String,
      enum: ['pending', 'processed', 'failed'],
      default: 'pending'
    }
  },
  reminders: [{
    type: {
      type: String,
      enum: ['email', 'sms', 'push'],
      required: true
    },
    sentAt: Date,
    status: {
      type: String,
      enum: ['sent', 'delivered', 'failed'],
      default: 'sent'
    }
  }],
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    uploadedAt: { type: Date, default: Date.now }
  }],
  rating: {
    score: {
      type: Number,
      min: 1,
      max: 5
    },
    review: {
      type: String,
      maxlength: [500, 'Review cannot exceed 500 characters']
    },
    ratedAt: Date
  }
}, {
  timestamps: true
});

// Indexes for better query performance
appointmentSchema.index({ patientId: 1, appointmentDate: -1 });
appointmentSchema.index({ doctorId: 1, appointmentDate: -1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ appointmentDate: 1, appointmentTime: 1 });
appointmentSchema.index({ 'payment.status': 1 });

// Compound index for unique appointments
appointmentSchema.index({ 
  doctorId: 1, 
  appointmentDate: 1, 
  appointmentTime: 1 
}, { 
  unique: true,
  partialFilterExpression: { status: { $nin: ['cancelled'] } }
});

// Virtual for appointment end time
appointmentSchema.virtual('endTime').get(function() {
  const startTime = new Date(`2000-01-01T${this.appointmentTime}`);
  const endTime = new Date(startTime.getTime() + this.duration * 60000);
  return endTime.toTimeString().slice(0, 5);
});

// Virtual for appointment status display
appointmentSchema.virtual('statusDisplay').get(function() {
  const statusMap = {
    'pending': 'Pending Confirmation',
    'confirmed': 'Confirmed',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
    'rescheduled': 'Rescheduled',
    'no-show': 'No Show'
  };
  return statusMap[this.status] || this.status;
});

// Method to check if appointment can be cancelled
appointmentSchema.methods.canBeCancelled = function() {
  const now = new Date();
  const appointmentDateTime = new Date(`${this.appointmentDate.toDateString()} ${this.appointmentTime}`);
  const hoursUntilAppointment = (appointmentDateTime - now) / (1000 * 60 * 60);
  
  return this.status === 'confirmed' && hoursUntilAppointment > 24;
};

// Method to check if appointment can be rescheduled
appointmentSchema.methods.canBeRescheduled = function() {
  const now = new Date();
  const appointmentDateTime = new Date(`${this.appointmentDate.toDateString()} ${this.appointmentTime}`);
  const hoursUntilAppointment = (appointmentDateTime - now) / (1000 * 60 * 60);
  
  return (this.status === 'confirmed' || this.status === 'pending') && hoursUntilAppointment > 2;
};

// Method to calculate refund amount
appointmentSchema.methods.calculateRefund = function() {
  const now = new Date();
  const appointmentDateTime = new Date(`${this.appointmentDate.toDateString()} ${this.appointmentTime}`);
  const hoursUntilAppointment = (appointmentDateTime - now) / (1000 * 60 * 60);
  
  if (hoursUntilAppointment > 24) {
    return this.payment.amount; // Full refund
  } else if (hoursUntilAppointment > 2) {
    return this.payment.amount * 0.5; // 50% refund
  } else {
    return 0; // No refund
  }
};

// Pre-save middleware to validate appointment time
appointmentSchema.pre('save', function(next) {
  // Check if appointment is in the future
  const appointmentDateTime = new Date(`${this.appointmentDate.toDateString()} ${this.appointmentTime}`);
  if (appointmentDateTime <= new Date()) {
    return next(new Error('Appointment must be scheduled for a future date and time'));
  }
  
  // Check if appointment is not more than 3 months in advance
  const threeMonthsFromNow = new Date();
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
  if (appointmentDateTime > threeMonthsFromNow) {
    return next(new Error('Appointments cannot be scheduled more than 3 months in advance'));
  }
  
  next();
});

module.exports = mongoose.model('Appointment', appointmentSchema);
