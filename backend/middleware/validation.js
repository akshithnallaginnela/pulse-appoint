const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// User registration validation
const validateUserRegistration = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),
  
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters'),
  
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('phone')
    .matches(/^[0-9]{10}$/)
    .withMessage('Please enter a valid 10-digit phone number'),
  
  body('dateOfBirth')
    .isISO8601()
    .withMessage('Please enter a valid date of birth')
    .custom((value) => {
      const birthDate = new Date(value);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 0 || age > 120) {
        throw new Error('Please enter a valid date of birth');
      }
      return true;
    }),
  
  body('gender')
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other'),
  
  body('role')
    .optional()
    .isIn(['patient', 'doctor', 'admin'])
    .withMessage('Invalid role'),
  
  handleValidationErrors
];

// User login validation
const validateUserLogin = [
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

// Doctor profile validation
const validateDoctorProfile = [
  body('licenseNumber')
    .trim()
    .notEmpty()
    .withMessage('Medical license number is required'),
  
  body('specialization')
    .isIn([
      'Cardiologist', 'Pediatrician', 'Dermatologist', 'Orthopedic Surgeon',
      'General Physician', 'Neurologist', 'Gynecologist', 'Psychiatrist',
      'Oncologist', 'Radiologist', 'Anesthesiologist', 'Emergency Medicine',
      'Family Medicine', 'Internal Medicine', 'Ophthalmologist', 'ENT Specialist',
      'Urologist', 'Endocrinologist', 'Gastroenterologist', 'Pulmonologist',
      'Rheumatologist', 'Nephrologist', 'Hematologist', 'Infectious Disease', 'Other'
    ])
    .withMessage('Invalid specialization'),
  
  body('experience')
    .isInt({ min: 0, max: 50 })
    .withMessage('Experience must be between 0 and 50 years'),
  
  body('consultationFee')
    .isFloat({ min: 0 })
    .withMessage('Consultation fee must be a positive number'),
  
  body('consultationDuration')
    .optional()
    .isInt({ min: 15, max: 120 })
    .withMessage('Consultation duration must be between 15 and 120 minutes'),
  
  body('bio')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Bio cannot exceed 1000 characters'),
  
  handleValidationErrors
];

// Appointment booking validation
const validateAppointmentBooking = [
  body('doctorId')
    .isMongoId()
    .withMessage('Invalid doctor ID'),
  
  body('appointmentDate')
    .isISO8601()
    .withMessage('Please enter a valid appointment date')
    .custom((value) => {
      const appointmentDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (appointmentDate < today) {
        throw new Error('Appointment date cannot be in the past');
      }
      
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
      
      if (appointmentDate > threeMonthsFromNow) {
        throw new Error('Appointments cannot be scheduled more than 3 months in advance');
      }
      
      return true;
    }),
  
  body('appointmentTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Please enter a valid time format (HH:MM)'),
  
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Reason for appointment is required')
    .isLength({ max: 500 })
    .withMessage('Reason cannot exceed 500 characters'),
  
  body('consultationType')
    .optional()
    .isIn(['in-person', 'video-call', 'phone-call'])
    .withMessage('Invalid consultation type'),
  
  body('symptoms')
    .optional()
    .isArray()
    .withMessage('Symptoms must be an array'),
  
  body('medicalHistory')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Medical history cannot exceed 1000 characters'),
  
  handleValidationErrors
];

// Payment validation
const validatePayment = [
  body('appointmentId')
    .isMongoId()
    .withMessage('Invalid appointment ID'),
  
  body('amount')
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number'),
  
  body('method')
    .isIn(['cash', 'card', 'upi', 'netbanking', 'wallet'])
    .withMessage('Invalid payment method'),
  
  handleValidationErrors
];

// MongoDB ObjectId validation
const validateObjectId = (paramName) => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName}`),
  
  handleValidationErrors
];

// Pagination validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors
];

// Search validation
const validateSearch = [
  query('search')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Search term must be between 2 and 100 characters'),
  
  query('specialization')
    .optional()
    .isIn([
      'Cardiologist', 'Pediatrician', 'Dermatologist', 'Orthopedic Surgeon',
      'General Physician', 'Neurologist', 'Gynecologist', 'Psychiatrist',
      'Oncologist', 'Radiologist', 'Anesthesiologist', 'Emergency Medicine',
      'Family Medicine', 'Internal Medicine', 'Ophthalmologist', 'ENT Specialist',
      'Urologist', 'Endocrinologist', 'Gastroenterologist', 'Pulmonologist',
      'Rheumatologist', 'Nephrologist', 'Hematologist', 'Infectious Disease', 'Other'
    ])
    .withMessage('Invalid specialization'),
  
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateUserLogin,
  validateDoctorProfile,
  validateAppointmentBooking,
  validatePayment,
  validateObjectId,
  validatePagination,
  validateSearch
};
