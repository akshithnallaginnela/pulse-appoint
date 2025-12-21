const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  intent: {
    type: String,
    enum: [
      'book_appointment',
      'cancel_appointment',
      'reschedule_appointment',
      'view_appointments',
      'search_doctors',
      'doctor_info',
      'availability_check',
      'greeting',
      'help',
      'fallback',
      'confirmation',
      'other'
    ]
  },
  entities: {
    doctorName: String,
    specialization: String,
    department: String,
    date: Date,
    time: String,
    appointmentId: String
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const conversationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  messages: [messageSchema],
  context: {
    currentIntent: String,
    awaitingInput: {
      type: Boolean,
      default: false
    },
    expectedInputType: String, // 'date', 'time', 'doctor', 'confirmation', etc.
    pendingAction: {
      type: {
        type: String,
        enum: ['book_appointment', 'cancel_appointment', 'reschedule_appointment']
      },
      data: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
      }
    },
    lastDoctorSearch: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor'
    }],
    selectedDoctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor'
    },
    selectedDate: Date,
    selectedTime: String,
    availableSlots: [String], // Array of available time slots
    appointmentReason: String, // Reason for visit
    appointmentToCancel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment'
    },
    appointmentToReschedule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for better performance
conversationSchema.index({ userId: 1, sessionId: 1 });
conversationSchema.index({ isActive: 1, lastActivity: -1 });

// Update last activity on save
conversationSchema.pre('save', function(next) {
  this.lastActivity = new Date();
  next();
});

module.exports = mongoose.model('Conversation', conversationSchema);
