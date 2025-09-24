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

  // Verify JWT token
  let userId;
  let tokenError = null;
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      tokenError = 'No token provided';
    } else {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      userId = new ObjectId(decoded.userId);
    }
  } catch (error) {
    tokenError = 'Invalid token: ' + error.message;
  }

  let client;
  const results = {
    tokenValid: !tokenError,
    tokenError,
    userId: userId?.toString(),
    endpoints: {}
  };

  if (tokenError) {
    return res.status(401).json(results);
  }

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
    results.mongoConnected = true;

    // Test 1: Get user
    try {
      const users = db.collection('users');
      const user = await users.findOne({ _id: userId });
      results.endpoints.user = {
        success: true,
        found: !!user,
        data: user ? {
          name: user.name,
          email: user.email,
          setupCompleted: user.setupCompleted,
          currentBalance: user.currentBalance
        } : null
      };
    } catch (error) {
      results.endpoints.user = {
        success: false,
        error: error.message
      };
    }

    // Test 2: Get essentials
    try {
      const essentials = db.collection('essentials');
      const userEssentials = await essentials.find({ userId, isActive: true }).toArray();
      results.endpoints.essentials = {
        success: true,
        count: userEssentials.length,
        data: userEssentials
      };
    } catch (error) {
      results.endpoints.essentials = {
        success: false,
        error: error.message
      };
    }

    // Test 3: Get transactions
    try {
      const transactions = db.collection('transactions');
      const userTransactions = await transactions.find({ userId }).limit(5).toArray();
      results.endpoints.transactions = {
        success: true,
        count: userTransactions.length,
        data: userTransactions
      };
    } catch (error) {
      results.endpoints.transactions = {
        success: false,
        error: error.message
      };
    }

    return res.json(results);

  } catch (error) {
    results.mongoConnected = false;
    results.mongoError = error.message;
    return res.status(500).json(results);
  } finally {
    if (client) {
      await client.close();
    }
  }
}