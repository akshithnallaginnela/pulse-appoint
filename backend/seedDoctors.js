require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Doctor = require('./models/Doctor');

// Sample Indian doctors data
const sampleDoctors = [
  {
    firstName: 'Rajesh',
    lastName: 'Sharma',
    email: 'dr.rajesh.sharma@example.com',
    password: 'Doctor@123',
    phone: '9876543210',
    dateOfBirth: '1980-05-15',
    gender: 'male',
    address: {
      street: 'MG Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      zipCode: '400001',
      country: 'India'
    },
    role: 'doctor',
    licenseNumber: 'MHMC123456',
    specialization: 'Cardiologist',
    experience: 12,
    consultationFee: 1200,
    education: [
      {
        degree: 'MD',
        institution: 'AIIMS Delhi',
        year: 2008,
        specialization: 'Cardiology'
      }
    ],
    availability: {
      monday: { isAvailable: true, startTime: '09:00', endTime: '17:00', breakStartTime: '13:00', breakEndTime: '14:00' },
      tuesday: { isAvailable: true, startTime: '09:00', endTime: '17:00', breakStartTime: '13:00', breakEndTime: '14:00' },
      wednesday: { isAvailable: true, startTime: '09:00', endTime: '17:00', breakStartTime: '13:00', breakEndTime: '14:00' },
      thursday: { isAvailable: true, startTime: '09:00', endTime: '17:00', breakStartTime: '13:00', breakEndTime: '14:00' },
      friday: { isAvailable: true, startTime: '09:00', endTime: '17:00', breakStartTime: '13:00', breakEndTime: '14:00' },
      saturday: { isAvailable: false },
      sunday: { isAvailable: false }
    }
  },
  {
    firstName: 'Priya',
    lastName: 'Patel',
    email: 'dr.priya.patel@example.com',
    password: 'Doctor@123',
    phone: '9876543211',
    dateOfBirth: '1985-08-20',
    gender: 'female',
    address: {
      street: 'Brigade Road',
      city: 'Bangalore',
      state: 'Karnataka',
      zipCode: '560001',
      country: 'India'
    },
    role: 'doctor',
    licenseNumber: 'KARMC654321',
    specialization: 'Pediatrician',
    experience: 8,
    consultationFee: 1000,
    education: [
      {
        degree: 'MD',
        institution: 'St. John\'s Medical College',
        year: 2013,
        specialization: 'Pediatrics'
      }
    ],
    availability: {
      monday: { isAvailable: true, startTime: '10:00', endTime: '18:00', breakStartTime: '13:30', breakEndTime: '14:30' },
      tuesday: { isAvailable: true, startTime: '10:00', endTime: '18:00', breakStartTime: '13:30', breakEndTime: '14:30' },
      wednesday: { isAvailable: true, startTime: '10:00', endTime: '18:00', breakStartTime: '13:30', breakEndTime: '14:30' },
      thursday: { isAvailable: true, startTime: '10:00', endTime: '18:00', breakStartTime: '13:30', breakEndTime: '14:30' },
      friday: { isAvailable: true, startTime: '10:00', endTime: '16:00', breakStartTime: '13:00', breakEndTime: '14:00' },
      saturday: { isAvailable: true, startTime: '10:00', endTime: '14:00' },
      sunday: { isAvailable: false }
    }
  },
  {
    firstName: 'Amit',
    lastName: 'Kumar',
    email: 'dr.amit.kumar@example.com',
    password: 'Doctor@123',
    phone: '9876543212',
    dateOfBirth: '1978-11-10',
    gender: 'male',
    address: {
      street: 'Connaught Place',
      city: 'New Delhi',
      state: 'Delhi',
      zipCode: '110001',
      country: 'India'
    },
    role: 'doctor',
    licenseNumber: 'DELMC789012',
    specialization: 'Orthopedic Surgeon',
    experience: 15,
    consultationFee: 1500,
    education: [
      {
        degree: 'MS',
        institution: 'AIIMS Delhi',
        year: 2006,
        specialization: 'Orthopedics'
      }
    ],
    availability: {
      monday: { isAvailable: true, startTime: '08:00', endTime: '16:00', breakStartTime: '12:30', breakEndTime: '13:30' },
      tuesday: { isAvailable: true, startTime: '08:00', endTime: '16:00', breakStartTime: '12:30', breakEndTime: '13:30' },
      wednesday: { isAvailable: false },
      thursday: { isAvailable: true, startTime: '08:00', endTime: '16:00', breakStartTime: '12:30', breakEndTime: '13:30' },
      friday: { isAvailable: true, startTime: '08:00', endTime: '16:00', breakStartTime: '12:30', breakEndTime: '13:30' },
      saturday: { isAvailable: true, startTime: '09:00', endTime: '13:00' },
      sunday: { isAvailable: false }
    }
  }
];

async function seedDoctors() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/doctor-appointment', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Clear existing data (optional)
    await User.deleteMany({ role: 'doctor' });
    await Doctor.deleteMany({});
    console.log('Cleared existing doctors data');

    // Create doctors
    for (const doctorData of sampleDoctors) {
      // Create user
      const hashedPassword = await bcrypt.hash(doctorData.password, 10);
      
      const user = new User({
        firstName: doctorData.firstName,
        lastName: doctorData.lastName,
        email: doctorData.email,
        password: hashedPassword,
        phone: doctorData.phone,
        dateOfBirth: doctorData.dateOfBirth,
        gender: doctorData.gender,
        address: doctorData.address,
        role: 'doctor',
        isEmailVerified: true
      });

      const savedUser = await user.save();
      console.log(`Created user: ${savedUser.email}`);

      // Create doctor profile
      const doctor = new Doctor({
        userId: savedUser._id,
        licenseNumber: doctorData.licenseNumber,
        specialization: doctorData.specialization,
        experience: doctorData.experience,
        education: doctorData.education,
        consultationFee: doctorData.consultationFee,
        availability: doctorData.availability,
        isVerified: true
      });

      await doctor.save();
      console.log(`Created doctor profile for: ${savedUser.firstName} ${savedUser.lastName}`);
    }

    console.log('Successfully seeded doctors data');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding doctors:', error);
    process.exit(1);
  }
}

seedDoctors();
