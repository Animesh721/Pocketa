const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Import routes
const authRoutes = require('../backend/routes/auth');
const userRoutes = require('../backend/routes/user');
const transactionRoutes = require('../backend/routes/transactions');
const statsRoutes = require('../backend/routes/stats');
const adviceRoutes = require('../backend/routes/advice');
const allowanceRoutes = require('../backend/routes/allowance');
const reportsRoutes = require('../backend/routes/reports');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(express.json());

// Connect to MongoDB
let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pocketa', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    isConnected = true;
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
};

// Routes (no /api prefix needed in Vercel)
app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/transactions', transactionRoutes);
app.use('/stats', statsRoutes);
app.use('/advice', adviceRoutes);
app.use('/allowance', allowanceRoutes);
app.use('/reports', reportsRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Pocketa API is running on Vercel!' });
});

// Serverless function handler
module.exports = async (req, res) => {
  try {
    await connectDB();
    return app(req, res);
  } catch (error) {
    console.error('Serverless function error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};