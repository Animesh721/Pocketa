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

    // Get allowance history
    const allowances = db.collection('allowances');
    const allowanceHistory = await allowances.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    // Get transactions to calculate spending for each allowance period
    const transactions = db.collection('transactions');

    // For now, we'll calculate monthly spending from allowance category transactions
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const allowanceTransactions = await transactions.find({
      userId,
      category: 'Allowance',
      createdAt: { $gte: startOfMonth }
    }).toArray();

    const totalAllowanceSpent = allowanceTransactions.reduce((sum, transaction) => sum + (transaction.amount || 0), 0);

    // Enhance allowance history with spending data
    // For now, we'll only track spending for the current month's allowances
    // Historical tracking would require more complex date-based transaction matching
    const enhancedHistory = allowanceHistory.map((allowance, index) => {
      // Only the most recent allowance should show actual spending
      // Older allowances should show 0 spent to avoid inflating totals
      if (index === 0 && allowanceHistory.length > 0) {
        const spent = totalAllowanceSpent;
        const remaining = Math.max(0, allowance.amount - spent);
        return {
          ...allowance,
          spent: spent,
          remaining: remaining,
          daysLasted: spent >= allowance.amount ?
            Math.floor((now - new Date(allowance.createdAt)) / (1000 * 60 * 60 * 24)) : null
        };
      }
      // For older allowances, don't show any spending to avoid double-counting
      // This prevents inflating the "total utilized" amount
      return {
        ...allowance,
        spent: 0, // Don't assume historical spending
        remaining: allowance.amount || 0, // Show full amount as remaining for historical records
        daysLasted: null // Unknown for historical records
      };
    });

    // Calculate totals
    const totalAllowances = allowanceHistory.reduce((sum, allowance) => sum + allowance.amount, 0);

    return res.json({
      history: enhancedHistory,
      totalAllowances,
      totalSpent: totalAllowanceSpent,
      count: allowanceHistory.length
    });

  } catch (error) {
    console.error('Allowance history error:', error);
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