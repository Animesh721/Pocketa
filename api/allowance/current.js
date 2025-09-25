const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Verify JWT token
  let userId;
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    userId = new ObjectId(decoded.userId);
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  let client;

  try {
    // Connect to MongoDB
    client = new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 5,
    });

    await client.connect();
    const db = client.db('pocketa');

    // Get user data
    const users = db.collection('users');
    const user = await users.findOne({ _id: userId });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Calculate spent amount and total deposits for current month
    const transactions = db.collection('transactions');
    const allowances = db.collection('allowances');
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get monthly allowance spending
    const monthlyTransactions = await transactions.find({
      userId,
      createdAt: { $gte: startOfMonth },
      category: 'Allowance'
    }).toArray();

    const allowanceSpent = monthlyTransactions.reduce((sum, transaction) => sum + (transaction.amount || 0), 0);

    // Get total allowance deposits this month
    const monthlyAllowances = await allowances.find({
      userId,
      createdAt: { $gte: startOfMonth }
    }).toArray();

    const totalMonthlyAllowances = monthlyAllowances.reduce((sum, allowance) => sum + (allowance.amount || 0), 0);

    // Debug logging
    console.log('Current Allowance Debug:', {
      userId: userId.toString(),
      userCurrentBalance: user.currentBalance,
      userLastAllowanceAmount: user.lastAllowanceAmount,
      allowanceSpent: allowanceSpent,
      totalMonthlyAllowances: totalMonthlyAllowances,
      monthlyAllowancesCount: monthlyAllowances.length,
      monthlyTransactionsCount: monthlyTransactions.length
    });

    return res.json({
      currentBalance: user.currentBalance || 0,
      lastAllowanceAmount: user.lastAllowanceAmount || 0,
      canRequestMore: true, // This can be enhanced later with business logic
      nextAllowanceDate: null, // This can be calculated based on frequency
      status: 'active',
      hasActiveAllowance: (user.lastAllowanceAmount || 0) > 0,
      currentTopup: {
        amount: totalMonthlyAllowances || 0, // Total deposits this month, not just last deposit
        spent: allowanceSpent,
        remaining: Math.max(0, user.currentBalance || 0), // Use actual current balance
        originalAmount: totalMonthlyAllowances || 0, // Total deposits this month
        carryOverAmount: 0 // Amount carried over from previous period
      }
    });

  } catch (error) {
    console.error('Current allowance error:', error);
    return res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
}