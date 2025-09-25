const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
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
    const transactions = db.collection('transactions');

    if (req.method === 'GET') {
      // Get query parameters
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      // Get transactions
      const userTransactions = await transactions.find({ userId })
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .toArray();

      return res.json({
        transactions: userTransactions,
        count: userTransactions.length,
        hasMore: userTransactions.length === limit
      });

    } else if (req.method === 'POST') {
      // Add new transaction/expense
      const { amount, description, category, date } = req.body;

      // Validation
      if (!amount || !description || !category || !date) {
        return res.status(400).json({
          message: 'All fields are required (amount, description, category, date)'
        });
      }

      if (parseFloat(amount) <= 0) {
        return res.status(400).json({
          message: 'Amount must be greater than 0'
        });
      }

      // Create transaction document
      const newTransaction = {
        userId,
        amount: parseFloat(amount),
        description: description.trim(),
        category,
        date: new Date(date),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('Creating new transaction:', newTransaction);

      // Insert transaction
      const result = await transactions.insertOne(newTransaction);
      console.log('Transaction inserted with ID:', result.insertedId);

      // Update user's current balance - only Allowance category expenses should deduct from allowance
      const users = db.collection('users');

      // Only deduct from allowance balance if it's an allowance expense
      if (category === 'Allowance') {
        await users.updateOne(
          { _id: userId },
          {
            $inc: { currentBalance: -parseFloat(amount) },
            $set: { updatedAt: new Date() }
          }
        );
        console.log(`Deducted ₹${amount} from allowance balance for ${category} expense`);
      } else {
        // For Essentials/Extra, just update timestamp (expense is tracked but doesn't affect allowance)
        await users.updateOne(
          { _id: userId },
          { $set: { updatedAt: new Date() } }
        );
        console.log(`Tracked ₹${amount} ${category} expense without affecting allowance balance`);
      }

      console.log('Updated user balance');

      // Return the created transaction
      const createdTransaction = await transactions.findOne({ _id: result.insertedId });

      return res.status(201).json({
        message: 'Expense added successfully',
        transaction: createdTransaction
      });
    }

  } catch (error) {
    console.error('Transactions error:', error);
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