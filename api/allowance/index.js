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

      const allowanceAmount = parseFloat(amount);

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

      console.log('Updated user balance with allowance');

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