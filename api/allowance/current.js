const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

module.exports = async function handler(req, res) {
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

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        message: 'Authentication configuration missing',
        error: 'JWT_SECRET not set'
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    userId = new ObjectId(decoded.userId);
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  let client;

  try {
    // Connect to MongoDB
    // Optimized for Vercel serverless functions
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

    // Get ALL monthly spending (all categories affect allowance balance)
    const monthlyTransactions = await transactions.find({
      userId,
      createdAt: { $gte: startOfMonth }
    }).toArray();

    const totalSpent = Math.round(monthlyTransactions.reduce((sum, transaction) => sum + (transaction.amount || 0), 0) * 100) / 100;

    console.log('Current Allowance API Debug - Monthly Transactions:', {
      count: monthlyTransactions.length,
      transactions: monthlyTransactions.map(t => ({
        amount: t.amount,
        description: t.description,
        category: t.category,
        createdAt: t.createdAt,
        date: t.date
      })),
      totalSpent: totalSpent,
      startOfMonth: startOfMonth
    });

    // Get total allowance deposits this month
    const monthlyAllowances = await allowances.find({
      userId,
      createdAt: { $gte: startOfMonth }
    }).toArray();

    const totalMonthlyAllowances = Math.round(monthlyAllowances.reduce((sum, allowance) => sum + (allowance.amount || 0), 0) * 100) / 100;

    console.log('Current Allowance API Debug - Monthly Allowances:', {
      count: monthlyAllowances.length,
      allowances: monthlyAllowances.map(a => ({
        amount: a.amount,
        description: a.description,
        createdAt: a.createdAt
      })),
      totalMonthlyAllowances: totalMonthlyAllowances
    });

    // Debug logging
    console.log('Current Allowance Debug:', {
      userId: userId.toString(),
      userCurrentBalance: user.currentBalance,
      userLastAllowanceAmount: user.lastAllowanceAmount,
      totalSpent: totalSpent,
      totalMonthlyAllowances: totalMonthlyAllowances,
      monthlyAllowancesCount: monthlyAllowances.length,
      monthlyTransactionsCount: monthlyTransactions.length
    });

    // Standardized balance calculation: monthly allowance deposits - ALL spending
    const calculatedRemaining = Math.max(0, Math.round((totalMonthlyAllowances - totalSpent) * 100) / 100);

    // Use user's current balance if it's reasonable, otherwise use calculated
    // This handles cases where transactions were recorded via API but not reflected in calculation
    const userBalance = user.currentBalance || 0;
    const balanceDifference = Math.abs(userBalance - calculatedRemaining);

    // If user balance is close to calculated (within ₹10 difference), trust user balance
    const actualRemaining = (balanceDifference <= 10 && userBalance >= 0) ? userBalance : calculatedRemaining;

    console.log('Balance reconciliation:', {
      calculatedRemaining,
      userCurrentBalance: userBalance,
      difference: balanceDifference,
      usingUserBalance: balanceDifference <= 10 && userBalance >= 0,
      actualRemaining
    });

    return res.json({
      currentBalance: actualRemaining,
      lastAllowanceAmount: user.lastAllowanceAmount || 0,
      canRequestMore: true,
      nextAllowanceDate: null,
      status: 'active',
      hasActiveAllowance: totalMonthlyAllowances > 0,
      currentTopup: {
        amount: totalMonthlyAllowances || 0,
        spent: totalSpent, // ALL expenses affect allowance
        remaining: actualRemaining,
        originalAmount: totalMonthlyAllowances || 0,
        carryOverAmount: 0
      },
      debug: {
        userCurrentBalance: user.currentBalance,
        calculatedRemaining: calculatedRemaining,
        totalMonthlyAllowances: totalMonthlyAllowances,
        totalSpent: totalSpent
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