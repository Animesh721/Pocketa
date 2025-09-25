const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
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
    client = new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });

    await client.connect();
    const db = client.db('pocketa');

    // Get current user data
    const users = db.collection('users');
    const user = await users.findOne({ _id: userId });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Calculate correct balance based on actual data
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get monthly allowance deposits
    const allowances = db.collection('allowances');
    const monthlyAllowances = await allowances.find({
      userId,
      createdAt: { $gte: startOfMonth }
    }).toArray();

    const totalDeposits = monthlyAllowances.reduce((sum, a) => sum + a.amount, 0);

    // Get monthly allowance category transactions only
    const transactions = db.collection('transactions');
    const allowanceTransactions = await transactions.find({
      userId,
      createdAt: { $gte: startOfMonth },
      category: 'Allowance'
    }).toArray();

    const totalAllowanceSpent = allowanceTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Calculate correct balance: deposits - allowance spending
    const correctBalance = Math.max(0, totalDeposits - totalAllowanceSpent);

    console.log('Manual balance correction:', {
      userId: userId.toString(),
      oldBalance: user.currentBalance,
      newBalance: correctBalance
    });

    // Update user's balance
    await users.updateOne(
      { _id: userId },
      {
        $set: {
          currentBalance: correctBalance,
          updatedAt: new Date()
        }
      }
    );

    return res.status(200).json({
      message: `Balance corrected to ₹${correctBalance}`,
      before: user.currentBalance,
      after: correctBalance,
      calculation: {
        totalDeposits,
        totalAllowanceSpent,
        formula: 'deposits - allowance_spending',
        note: 'Only Allowance category expenses deduct from allowance balance'
      },
      deposits: monthlyAllowances.map(a => ({
        amount: a.amount,
        date: a.createdAt,
        description: a.description
      })),
      allowanceExpenses: allowanceTransactions.map(t => ({
        amount: t.amount,
        date: t.createdAt,
        description: t.description
      }))
    });

  } catch (error) {
    console.error('Set balance error:', error);
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