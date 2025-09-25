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

    // Get essentials
    const essentials = db.collection('essentials');
    const userEssentials = await essentials.find({ userId, isActive: true }).toArray();

    // Calculate total monthly essentials
    const totalEssentials = userEssentials.reduce((sum, essential) => sum + essential.amount, 0);

    // Get transactions (if collection exists)
    const transactions = db.collection('transactions');
    const recentTransactions = await transactions.find({ userId }).sort({ createdAt: -1 }).limit(10).toArray();

    // Calculate total spent this month (basic calculation)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyTransactions = await transactions.find({
      userId,
      createdAt: { $gte: startOfMonth }
    }).toArray();

    // Calculate spending by category
    const spendingByCategory = {
      'Allowance': 0,
      'Essentials': 0,
      'Extra': 0
    };

    monthlyTransactions.forEach(transaction => {
      const category = transaction.category || 'Allowance';
      if (spendingByCategory.hasOwnProperty(category)) {
        spendingByCategory[category] += transaction.amount || 0;
      }
    });

    const totalSpentThisMonth = monthlyTransactions.reduce((sum, transaction) => sum + (transaction.amount || 0), 0);

    return res.json({
      currentBalance: user.currentBalance || 0,
      lastAllowanceAmount: user.lastAllowanceAmount || 0,
      allowance: {
        spent: spendingByCategory['Allowance'],
        budget: user.lastAllowanceAmount || 0,
        remaining: Math.max(0, (user.lastAllowanceAmount || 0) - spendingByCategory['Allowance'])
      },
      essentials: {
        spent: spendingByCategory['Essentials'],
        budget: totalEssentials,
        remaining: Math.max(0, totalEssentials - spendingByCategory['Essentials'])
      },
      extra: {
        spent: spendingByCategory['Extra'],
        budget: 0, // Extra budget if any
        remaining: 0
      },
      totalSpent: totalSpentThisMonth, // Total spent this month
      totalSpentThisMonth,
      totalEssentials,
      essentialsCount: userEssentials.length,
      transactionsCount: recentTransactions.length,
      // Add category breakdown for ExpenseChart
      categoryBreakdown: spendingByCategory,
      // Add current period for dashboard display
      currentPeriod: {
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
        type: 'monthly'
      }
    });

  } catch (error) {
    console.error('Stats error:', error);
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