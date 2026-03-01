require('dotenv').config();
const mongoose = require('mongoose');
const Doctor = require('./models/Doctor');
const User = require('./models/User');

async function clean() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/doctor-appointment');
  const docs = await Doctor.find().populate('userId', 'firstName');
  const orphans = docs.filter(d => !d.userId);
  console.log('Orphaned doctor records:', orphans.length);
  if (orphans.length) {
    const ids = orphans.map(d => d._id);
    await Doctor.deleteMany({ _id: { $in: ids } });
    console.log('Deleted orphaned records');
  } else {
    console.log('No cleanup needed');
  }
  process.exit(0);
}
clean();
