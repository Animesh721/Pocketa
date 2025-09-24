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
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 5,
    });

    console.log('MongoDB connected');

    // Try to import User model
    let User;
    try {
      User = require('../backend/models/User');
      console.log('User model imported successfully');
    } catch (importError) {
      return res.status(500).json({
        success: false,
        step: 'User model import',
        error: importError.message,
        stack: importError.stack
      });
    }

    // Try to create a test user (without saving)
    try {
      const testUser = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: 'testpassword123'
      });

      console.log('Test user created successfully');

      return res.status(200).json({
        success: true,
        message: 'User model test successful',
        modelFields: Object.keys(User.schema.paths),
        testUserData: {
          name: testUser.name,
          email: testUser.email,
          hasPassword: !!testUser.password
        }
      });

    } catch (modelError) {
      return res.status(500).json({
        success: false,
        step: 'User model instantiation',
        error: modelError.message,
        stack: modelError.stack
      });
    }

  } catch (error) {
    return res.status(500).json({
      success: false,
      step: 'MongoDB connection or general error',
      error: error.message,
      stack: error.stack
    });
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  }
}