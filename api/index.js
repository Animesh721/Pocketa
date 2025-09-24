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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/advice', adviceRoutes);
app.use('/api/allowance', allowanceRoutes);
app.use('/api/reports', reportsRoutes);

// Health check
app.get('/api', (req, res) => {
  res.json({ message: 'Pocketa API is running on Vercel!' });
});

// Serverless function handler
module.exports = async (req, res) => {
  await connectDB();
  return app(req, res);
};