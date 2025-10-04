const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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

    if (req.method === 'POST') {
      // Create new allowance/deposit
      const { amount, description, receivedDate } = req.body;

      console.log('Received deposit request:', { amount, description, receivedDate });

      // Validation
      if (!amount || parseFloat(amount) <= 0) {
        return res.status(400).json({
          message: 'Amount is required and must be greater than 0'
        });
      }

      // Round to 2 decimal places to avoid floating point precision issues
      const allowanceAmount = Math.round(parseFloat(amount) * 100) / 100;

      // Create allowance record
      const allowances = db.collection('allowances');
      const newAllowance = {
        userId,
        amount: allowanceAmount,
        description: description || 'Allowance deposit',
        receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('Creating new allowance:', newAllowance);
      const result = await allowances.insertOne(newAllowance);

      // Update user's current balance and last allowance amount
      const users = db.collection('users');
      await users.updateOne(
        { _id: userId },
        {
          $inc: { currentBalance: allowanceAmount },
          $set: {
            lastAllowanceAmount: allowanceAmount,
            updatedAt: new Date()
          }
        }
      );

      // Auto-fix balance: recalculate the correct balance after deposit
      // Get current month data to ensure balance is accurate
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Get total allowance deposits this month (including the one just added)
      const monthlyAllowances = await allowances.find({
        userId,
        createdAt: { $gte: startOfMonth }
      }).toArray();

      const totalDeposits = Math.round(monthlyAllowances.reduce((sum, a) => sum + a.amount, 0) * 100) / 100;

      // Get total expenses this month
      const transactions = db.collection('transactions');
      const monthlyTransactions = await transactions.find({
        userId,
        createdAt: { $gte: startOfMonth }
      }).toArray();

      const totalExpenses = Math.round(monthlyTransactions.reduce((sum, t) => sum + t.amount, 0) * 100) / 100;

      // Calculate correct balance and update if different
      const correctBalance = Math.max(0, Math.round((totalDeposits - totalExpenses) * 100) / 100);

      await users.updateOne(
        { _id: userId },
        {
          $set: {
            currentBalance: correctBalance,
            updatedAt: new Date()
          }
        }
      );

      console.log('Balance auto-corrected:', {
        totalDeposits,
        totalExpenses,
        correctBalance
      });

      console.log('Updated user balance with allowance');

      // Debug: Check the updated user record
      const updatedUser = await users.findOne({ _id: userId });
      console.log('User after allowance update:', {
        currentBalance: updatedUser.currentBalance,
        lastAllowanceAmount: updatedUser.lastAllowanceAmount
      });

      // Return the created allowance
      const createdAllowance = await allowances.findOne({ _id: result.insertedId });

      return res.status(201).json({
        message: 'Allowance added successfully',
        allowance: createdAllowance
      });

    } else {
      return res.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Allowance error:', error);
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