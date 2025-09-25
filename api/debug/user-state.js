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

    // Get all allowances
    const allowances = db.collection('allowances');
    const allAllowances = await allowances.find({ userId }).sort({ createdAt: -1 }).toArray();

    // Get all transactions
    const transactions = db.collection('transactions');
    const allTransactions = await transactions.find({ userId }).sort({ createdAt: -1 }).toArray();

    // Calculate monthly data
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthlyAllowances = allAllowances.filter(a => a.createdAt >= startOfMonth);
    const monthlyTransactions = allTransactions.filter(t => t.createdAt >= startOfMonth);

    return res.json({
      user: {
        currentBalance: user.currentBalance,
        lastAllowanceAmount: user.lastAllowanceAmount,
        updatedAt: user.updatedAt
      },
      allowances: {
        total: allAllowances.length,
        thisMonth: monthlyAllowances.length,
        monthlyTotal: monthlyAllowances.reduce((sum, a) => sum + a.amount, 0),
        recent: allAllowances.slice(0, 3).map(a => ({
          amount: a.amount,
          description: a.description,
          createdAt: a.createdAt
        }))
      },
      transactions: {
        total: allTransactions.length,
        thisMonth: monthlyTransactions.length,
        byCategory: {
          allowance: monthlyTransactions.filter(t => t.category === 'Allowance').reduce((sum, t) => sum + t.amount, 0),
          essentials: monthlyTransactions.filter(t => t.category === 'Essentials').reduce((sum, t) => sum + t.amount, 0),
          extra: monthlyTransactions.filter(t => t.category === 'Extra').reduce((sum, t) => sum + t.amount, 0)
        },
        recent: allTransactions.slice(0, 5).map(t => ({
          amount: t.amount,
          category: t.category,
          description: t.description,
          createdAt: t.createdAt
        }))
      },
      calculated: {
        expectedBalance: monthlyAllowances.reduce((sum, a) => sum + a.amount, 0) - monthlyTransactions.filter(t => t.category === 'Allowance').reduce((sum, t) => sum + t.amount, 0)
      }
    });

  } catch (error) {
    console.error('Debug user state error:', error);
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