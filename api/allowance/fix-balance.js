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
    // Check MongoDB URI configuration
    if (!process.env.MONGODB_URI) {
      return res.status(500).json({
        message: 'Database configuration missing',
        error: 'MONGODB_URI not set'
      });
    }

    client = new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 5,
    });

    await client.connect();
    const db = client.db('pocketa');

    // Get current month data
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get all allowance deposits this month
    const allowances = db.collection('allowances');
    const monthlyAllowances = await allowances.find({
      userId,
      createdAt: { $gte: startOfMonth }
    }).toArray();

    const totalDeposits = monthlyAllowances.reduce((sum, a) => sum + a.amount, 0);

    // Get ALL monthly transactions (all categories affect allowance balance)
    const transactions = db.collection('transactions');
    const allTransactions = await transactions.find({
      userId,
      createdAt: { $gte: startOfMonth }
    }).toArray();

    const totalExpenses = allTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Calculate correct balance: deposits - ALL expenses
    const correctBalance = Math.max(0, totalDeposits - totalExpenses);

    // Update user's current balance to the correct value
    const users = db.collection('users');
    const user = await users.findOne({ _id: userId });

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
      message: 'Balance corrected successfully',
      before: {
        currentBalance: user.currentBalance,
        lastAllowanceAmount: user.lastAllowanceAmount
      },
      after: {
        currentBalance: correctBalance,
        totalDeposits: totalDeposits,
        totalExpenses: totalExpenses
      },
      calculation: {
        deposits: monthlyAllowances.map(a => ({ amount: a.amount, date: a.createdAt, description: a.description })),
        allExpenses: allTransactions.map(t => ({ amount: t.amount, description: t.description, date: t.createdAt, category: t.category })),
        formula: 'deposits - all_expenses',
        note: 'ALL expenses (any category) deduct from allowance balance'
      }
    });

  } catch (error) {
    console.error('Fix balance error:', error);
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