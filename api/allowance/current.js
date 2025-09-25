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

    // The user's currentBalance should be the source of truth
    // It gets updated when: +allowance deposits, -allowance category expenses
    const actualRemaining = Math.max(0, user.currentBalance || 0);

    // For display purposes, show total monthly context
    const calculatedRemaining = Math.max(0, totalMonthlyAllowances - allowanceSpent);

    return res.json({
      currentBalance: actualRemaining,
      lastAllowanceAmount: user.lastAllowanceAmount || 0,
      canRequestMore: true,
      nextAllowanceDate: null,
      status: 'active',
      hasActiveAllowance: totalMonthlyAllowances > 0,
      currentTopup: {
        amount: totalMonthlyAllowances || 0,
        spent: allowanceSpent,
        remaining: actualRemaining,
        originalAmount: totalMonthlyAllowances || 0,
        carryOverAmount: 0
      },
      debug: {
        userCurrentBalance: user.currentBalance,
        calculatedRemaining: calculatedRemaining,
        totalMonthlyAllowances: totalMonthlyAllowances,
        allowanceSpent: allowanceSpent
      }
    });

  } catch (error) {
    console.error('Current allowance error:', error);
    console.error('Error details:', {
      code: error.code,
      codeName: error.codeName,
      stack: error.stack
    });

    return res.status(500).json({
      message: 'Server error',
      error: error.message,
      code: error.code || 'UNKNOWN',
      type: error.constructor.name,
      mongoUriExists: !!process.env.MONGODB_URI
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
}