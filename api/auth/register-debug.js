const mongoose = require('mongoose');

// Import User model
const User = require('../../backend/models/User');

// Connect to MongoDB
let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    isConnected = true;
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

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

  try {
    // Step 1: Test database connection
    await connectDB();
    console.log('✅ Database connected');

    // Step 2: Test request body
    const { username, name, email, password, confirmPassword } = req.body;
    console.log('📝 Request body received:', { username, name, email, passwordProvided: !!password });

    // Use username as name if name is not provided
    const userName = name || username;

    // Step 3: Test validation
    if (!userName || !email || !password) {
      return res.status(400).json({
        message: 'All fields are required',
        debug: { userName: !!userName, email: !!email, password: !!password }
      });
    }

    // Debug password comparison
    console.log('🔍 Password comparison debug:', {
      password: password,
      confirmPassword: confirmPassword,
      passwordType: typeof password,
      confirmPasswordType: typeof confirmPassword,
      passwordLength: password?.length,
      confirmPasswordLength: confirmPassword?.length,
      areEqual: password === confirmPassword
    });

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        message: 'Passwords do not match',
        debug: {
          passwordProvided: !!password,
          confirmPasswordProvided: !!confirmPassword,
          passwordsMatch: password === confirmPassword
        }
      });
    }

    console.log('✅ Validation passed');

    // Step 4: Test user existence check
    const existingUser = await User.findOne({ email });
    console.log('📧 Existing user check:', existingUser ? 'User exists' : 'User not found');

    if (existingUser) {
      return res.status(400).json({
        message: 'User with this email already exists'
      });
    }

    // Step 5: Test user creation
    console.log('👤 Creating new user...');
    const user = new User({
      name: userName,
      email,
      password // The model will hash this automatically
    });

    console.log('💾 Saving user to database...');
    await user.save();
    console.log('✅ User saved successfully');

    // Step 6: Test token generation
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );
    console.log('🔑 JWT token generated');

    res.status(201).json({
      message: 'User registered successfully',
      debug: {
        userId: user._id,
        userName: user.name,
        email: user.email,
        tokenGenerated: !!token
      },
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({
      message: 'Server error during registration',
      error: error.message,
      stack: error.stack,
      debug: {
        step: 'See server logs for detailed step info'
      }
    });
  }
}