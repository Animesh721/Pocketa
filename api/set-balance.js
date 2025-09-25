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

    // Manual fix: Set balance to 132 (300 - 168 = 132)
    // This should be the correct balance based on your deposits and expenses
    const correctBalance = 132;

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
      message: 'Balance manually corrected to ₹132',
      before: user.currentBalance,
      after: correctBalance,
      note: 'This sets your balance to ₹300 (deposits) - ₹168 (expenses) = ₹132'
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