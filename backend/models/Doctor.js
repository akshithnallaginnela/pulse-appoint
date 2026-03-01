const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  licenseNumber: {
    type: String,
    required: [true, 'Medical license number is required'],
    unique: true,
    trim: true
  },
  specialization: {
    type: String,
    required: [true, 'Specialization is required'],
    trim: true,
    enum: [
      'Cardiologist',
      'Pediatrician', 
      'Dermatologist',
      'Orthopedic Surgeon',
      'General Physician',
      'Neurologist',
      'Gynecologist',
      'Psychiatrist',
      'Oncologist',
      'Radiologist',
      'Anesthesiologist',
      'Emergency Medicine',
      'Family Medicine',
      'Internal Medicine',
      'Ophthalmologist',
      'ENT Specialist',
      'Urologist',
      'Endocrinologist',
      'Gastroenterologist',
      'Pulmonologist',
      'Rheumatologist',
      'Nephrologist',
      'Hematologist',
      'Infectious Disease',
      'Dentist',
      'Other'
    ]
  },
  experience: {
    type: Number,
    required: [true, 'Years of experience is required'],
    min: [0, 'Experience cannot be negative'],
    max: [50, 'Experience cannot exceed 50 years']
  },
  education: [{
    degree: { type: String, required: true },
    institution: { type: String, required: true },
    year: { type: Number, required: true },
    specialization: String
  }],
  certifications: [{
    name: String,
    issuingOrganization: String,
    issueDate: Date,
    expiryDate: Date,
    credentialId: String
  }],
  hospitalAffiliations: [{
    hospitalName: String,
    position: String,
    startDate: Date,
    endDate: Date,
    isCurrent: { type: Boolean, default: false }
  }],
  consultationFee: {
    type: Number,
    required: [true, 'Consultation fee is required'],
    min: [0, 'Consultation fee cannot be negative']
  },
  availability: {
    monday: {
      isAvailable: { type: Boolean, default: false },
      startTime: String,
      endTime: String,
      breakStartTime: String,
      breakEndTime: String
    },
    tuesday: {
      isAvailable: { type: Boolean, default: false },
      startTime: String,
      endTime: String,
      breakStartTime: String,
      breakEndTime: String
    },
    wednesday: {
      isAvailable: { type: Boolean, default: false },
      startTime: String,
      endTime: String,
      breakStartTime: String,
      breakEndTime: String
    },
    thursday: {
      isAvailable: { type: Boolean, default: false },
      startTime: String,
      endTime: String,
      breakStartTime: String,
      breakEndTime: String
    },
    friday: {
      isAvailable: { type: Boolean, default: false },
      startTime: String,
      endTime: String,
      breakStartTime: String,
      breakEndTime: String
    },
    saturday: {
      isAvailable: { type: Boolean, default: false },
      startTime: String,
      endTime: String,
      breakStartTime: String,
      breakEndTime: String
    },
    sunday: {
      isAvailable: { type: Boolean, default: false },
      startTime: String,
      endTime: String,
      breakStartTime: String,
      breakEndTime: String
    }
  },
  consultationDuration: {
    type: Number,
    default: 30, // in minutes
    min: [15, 'Minimum consultation duration is 15 minutes'],
    max: [120, 'Maximum consultation duration is 120 minutes']
  },
  languages: [{
    type: String,
    enum: ['English', 'Hindi', 'Tamil', 'Telugu', 'Bengali', 'Marathi', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi', 'Other']
  }],
  bio: {
    type: String,
    maxlength: [1000, 'Bio cannot exceed 1000 characters']
  },
  services: [String],
  awards: [{
    name: String,
    year: Number,
    organization: String
  }],
  publications: [{
    title: String,
    journal: String,
    year: Number,
    link: String
  }],
  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationDocuments: {
    licenseDocument: String,
    degreeCertificate: String,
    identityProof: String,
    addressProof: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  profileCompleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for better query performance
doctorSchema.index({ specialization: 1 });
doctorSchema.index({ 'availability.monday.isAvailable': 1 });
doctorSchema.index({ rating: -1 });
doctorSchema.index({ isVerified: 1 });
doctorSchema.index({ isActive: 1 });

// Virtual for full name (populated from User)
doctorSchema.virtual('fullName', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// Method to check if doctor is available at specific time
doctorSchema.methods.isAvailableAt = function(day, time) {
  const dayAvailability = this.availability[day.toLowerCase()];
  if (!dayAvailability || !dayAvailability.isAvailable) {
    return false;
  }
  
  const requestedTime = new Date(`2000-01-01T${time}`);
  const startTime = new Date(`2000-01-01T${dayAvailability.startTime}`);
  const endTime = new Date(`2000-01-01T${dayAvailability.endTime}`);
  
  // Check if time is within working hours
  if (requestedTime < startTime || requestedTime >= endTime) {
    return false;
  }
  
  // Check if time is during break
  if (dayAvailability.breakStartTime && dayAvailability.breakEndTime) {
    const breakStart = new Date(`2000-01-01T${dayAvailability.breakStartTime}`);
    const breakEnd = new Date(`2000-01-01T${dayAvailability.breakEndTime}`);
    if (requestedTime >= breakStart && requestedTime < breakEnd) {
      return false;
    }
  }
  
  return true;
};

// Method to get available time slots
doctorSchema.methods.getAvailableSlots = function(day, date) {
  const dayAvailability = this.availability[day.toLowerCase()];
  if (!dayAvailability || !dayAvailability.isAvailable) {
    return [];
  }
  
  const slots = [];
  const startTime = new Date(`2000-01-01T${dayAvailability.startTime}`);
  const endTime = new Date(`2000-01-01T${dayAvailability.endTime}`);
  const duration = this.consultationDuration;
  
  let currentTime = new Date(startTime);
  
  while (currentTime < endTime) {
    const slotTime = currentTime.toTimeString().slice(0, 5);
    
    // Skip break time
    if (dayAvailability.breakStartTime && dayAvailability.breakEndTime) {
      const breakStart = new Date(`2000-01-01T${dayAvailability.breakStartTime}`);
      const breakEnd = new Date(`2000-01-01T${dayAvailability.breakEndTime}`);
      if (currentTime >= breakStart && currentTime < breakEnd) {
        currentTime = new Date(breakEnd);
        continue;
      }
    }
    
    slots.push(slotTime);
    currentTime.setMinutes(currentTime.getMinutes() + duration);
  }
  
  return slots;
};

module.exports = mongoose.model('Doctor', doctorSchema);
