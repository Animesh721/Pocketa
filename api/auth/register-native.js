const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

export default async function handler(req, res) {
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
    // Use native MongoDB driver with same URI that works
    console.log('Connecting to MongoDB with native driver...');
    client = new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 5,
    });

    await client.connect();
    console.log('Connected to MongoDB successfully');

    const db = client.db('pocketa');
    const users = db.collection('users');

    const { username, name, email, password, confirmPassword } = req.body;
    const userName = name || username;

    // Validation
    if (!userName || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    // Check if user already exists
    console.log('Checking for existing user...');
    const existingUser = await users.findOne({ email });
    console.log('Existing user check completed');

    if (existingUser) {
      return res.status(400).json({
        message: 'User with this email already exists'
      });
    }

    // Hash password
    console.log('Hashing password...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user document
    const newUser = {
      name: userName,
      email,
      password: hashedPassword,
      lastAllowanceAmount: 0,
      currentBalance: 0,
      setupCompleted: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('Inserting new user...');
    const result = await users.insertOne(newUser);
    console.log('User inserted successfully');

    // Generate JWT token
    const token = jwt.sign(
      { userId: result.insertedId, email: newUser.email },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: result.insertedId,
        name: newUser.name,
        email: newUser.email
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      message: 'Server error during registration',
      error: error.message
    });
  } finally {
    // Close connection
    if (client) {
      await client.close();
    }
  }
}