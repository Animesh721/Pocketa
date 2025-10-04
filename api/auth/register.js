const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  let client;

  try {
    console.log('Register endpoint called');
    console.log('Request body:', JSON.stringify(req.body));

    // Optimized for Vercel serverless functions
    console.log('Connecting to MongoDB with native driver for registration...');
    if (!process.env.MONGODB_URI) {
      return res.status(500).json({
        message: 'Database configuration missing',
        error: 'MONGODB_URI not set'
      });
    }

    client = new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 5000,
    });

    await client.connect();
    console.log('Connected to MongoDB successfully');

    const db = client.db('pocketa');
    const users = db.collection('users');

    const { username, name, email, password, confirmPassword } = req.body;

    console.log('Register request body:', { username, name, email, hasPassword: !!password });

    // Use username as name if name is not provided
    const userName = name || username;

    // Validation
    if (!userName || !email || !password) {
      console.log('Validation failed:', { userName, email, hasPassword: !!password });
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    console.log('Checking if user exists with email:', email);

    // Check if user already exists
    const existingUser = await users.findOne({ email: email.toLowerCase().trim() });

    if (existingUser) {
      return res.status(400).json({
        message: 'User with this email already exists'
      });
    }

    console.log('Creating new user...');

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user document
    const newUser = {
      name: userName,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      lastAllowanceAmount: 0,
      currentBalance: 0,
      setupCompleted: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await users.insertOne(newUser);

    // Generate JWT token
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        message: 'Authentication configuration missing',
        error: 'JWT_SECRET not set'
      });
    }

    const token = jwt.sign(
      { userId: result.insertedId, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('User created successfully');

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: result.insertedId,
        name: newUser.name,
        email: newUser.email,
        setupCompleted: newUser.setupCompleted
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      message: 'Server error during registration',
      error: error.message
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
}