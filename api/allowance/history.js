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
    const allTransactions = await transactions.find({ userId })
      .sort({ createdAt: 1 })
      .toArray();

    // Process each allowance with its spending
    const enhancedHistory = [];

    for (let i = 0; i < allowanceHistory.length; i++) {
      const allowance = allowanceHistory[i];
      const nextAllowance = i > 0 ? allowanceHistory[i - 1] : null;

      // Determine the time period for this allowance
      const startDate = new Date(allowance.createdAt);
      const endDate = nextAllowance ? new Date(nextAllowance.createdAt) : new Date();

      // Get transactions within this allowance period
      const periodTransactions = allTransactions.filter(t => {
        const tDate = new Date(t.createdAt);
        return tDate >= startDate && tDate < endDate;
      });

      const spent = periodTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
      const remaining = Math.max(0, allowance.amount - spent);

      // Calculate if allowance was depleted
      const isActive = !nextAllowance; // Only the most recent is active
      const daysLasted = nextAllowance
        ? Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24))
        : null;
      const depletedDate = spent >= allowance.amount && nextAllowance
        ? endDate
        : null;

      enhancedHistory.push({
        ...allowance,
        spent,
        remaining,
        isActive,
        daysLasted,
        depletedDate,
        expenses: periodTransactions,
        expenseCount: periodTransactions.length
      });
    }

    // Calculate totals
    const totalAllowances = allowanceHistory.reduce((sum, allowance) => sum + allowance.amount, 0);
    const totalAllowanceSpent = enhancedHistory.reduce((sum, a) => sum + (a.spent || 0), 0);

    return res.json(enhancedHistory);

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