const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

module.exports = async function handler(req, res) {
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
    // Connect to MongoDB
    client = new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 5,
    });

    await client.connect();
    const db = client.db('pocketa');

    // Recalculate user's balance based on allowances and transactions
    const allowances = db.collection('allowances');
    const transactions = db.collection('transactions');
    const users = db.collection('users');

    // Get total allowances (deposits)
    const userAllowances = await allowances.find({ userId }).toArray();
    const totalAllowances = userAllowances.reduce((sum, allowance) => sum + allowance.amount, 0);

    // Get total expenses (transactions)
    const userTransactions = await transactions.find({ userId }).toArray();
    const totalExpenses = userTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);

    // Calculate correct balance
    const correctBalance = totalAllowances - totalExpenses;

    console.log('Balance sync calculation:', {
      totalAllowances,
      totalExpenses,
      correctBalance
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

    // Get updated user data
    const updatedUser = await users.findOne({ _id: userId });

    return res.json({
      message: 'Balance synced successfully',
      balance: {
        current: correctBalance,
        totalAllowances,
        totalExpenses,
        synced: true
      },
      user: {
        currentBalance: updatedUser.currentBalance,
        lastAllowanceAmount: updatedUser.lastAllowanceAmount
      }
    });

  } catch (error) {
    console.error('Balance sync error:', error);
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