const mongoose = require('mongoose');

// Test MongoDB connection
async function testConnection() {
  try {
    await mongoose.connect('mongodb://localhost:27017/doctor-appointment');
    console.log('✅ MongoDB connected successfully');
    
    // Test if we can create a simple document
    const testSchema = new mongoose.Schema({ name: String });
    const TestModel = mongoose.model('Test', testSchema);
    
    const testDoc = new TestModel({ name: 'Test Document' });
    await testDoc.save();
    console.log('✅ Database write test successful');
    
    await mongoose.disconnect();
    console.log('✅ MongoDB disconnected');
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
  }
}

testConnection();
