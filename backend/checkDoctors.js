require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Doctor = require('./models/Doctor');

async function checkDoctors() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/doctor-appointment');
    console.log('Connected to MongoDB');
    
    const doctors = await Doctor.find().populate('userId', 'firstName lastName');
    console.log(`\nDoctors in database: ${doctors.length}\n`);
    
    doctors.forEach(doc => {
      console.log(`- Dr. ${doc.userId.firstName} ${doc.userId.lastName}`);
      console.log(`  Specialization: ${doc.specialization}`);
      console.log(`  Active: ${doc.isActive}`);
      console.log(`  Verified: ${doc.isVerified}\n`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDoctors();
