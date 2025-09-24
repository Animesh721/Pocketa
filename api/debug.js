const mongoose = require('mongoose');

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Test MongoDB connection
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Test User model import
    let User;
    try {
      User = require('../backend/models/User');
    } catch (err) {
      return res.status(500).json({
        error: 'User model import failed',
        message: err.message,
        stack: err.stack
      });
    }

    // Test creating a simple user object (without saving)
    try {
      const testUser = new User({
        name: 'Test User',
        email: 'test@test.com',
        password: 'testpassword123'
      });

      return res.status(200).json({
        success: true,
        message: 'All tests passed',
        modelFields: Object.keys(User.schema.paths),
        testUserCreated: true,
        mongoConnection: mongoose.connection.readyState
      });
    } catch (err) {
      return res.status(500).json({
        error: 'User model instantiation failed',
        message: err.message,
        modelFields: User ? Object.keys(User.schema.paths) : 'Model not loaded'
      });
    }

  } catch (error) {
    return res.status(500).json({
      error: 'Debug test failed',
      message: error.message,
      stack: error.stack,
      mongoUri: process.env.MONGODB_URI ? 'Set' : 'Not Set'
    });
  }
}