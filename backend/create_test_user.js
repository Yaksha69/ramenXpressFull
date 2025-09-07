const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/user');

async function createTestUser() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ramenxpressApp');
    console.log('Connected to MongoDB');
    
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }
    
    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = new User({
      username: 'admin',
      password: hashedPassword,
      role: 'admin'
    });
    
    await admin.save();
    console.log('✅ Admin user created successfully!');
    console.log('Username: admin');
    console.log('Password: admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createTestUser();