const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
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
    console.log('Connecting to MongoDB...');
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
    console.log('Connected to MongoDB successfully');

    const db = client.db('pocketa');
    const users = db.collection('users');
    const essentials = db.collection('essentials');

    if (req.method === 'GET') {
      // Get user settings
      const user = await users.findOne({ _id: userId });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const userEssentials = await essentials.find({ userId, isActive: true }).toArray();

      return res.json({
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          lastAllowanceAmount: user.lastAllowanceAmount || 0,
          currentBalance: user.currentBalance || 0,
          setupCompleted: user.setupCompleted || false
        },
        essentials: userEssentials
      });

    } else if (req.method === 'POST') {
      // Update user settings (setup)
      const { essentials: requestEssentials } = req.body;

      console.log('Setting up user account...');

      // Update user setup status
      await users.updateOne(
        { _id: userId },
        {
          $set: {
            setupCompleted: true,
            updatedAt: new Date()
          }
        }
      );

      // Deactivate old essentials
      await essentials.updateMany(
        { userId },
        { $set: { isActive: false } }
      );

      // Add new essentials
      if (requestEssentials && requestEssentials.length > 0) {
        const validEssentials = requestEssentials.filter(essential =>
          essential.name &&
          essential.name.trim() !== '' &&
          essential.amount &&
          parseFloat(essential.amount) > 0 &&
          essential.dueDate &&
          parseInt(essential.dueDate) >= 1 &&
          parseInt(essential.dueDate) <= 31
        );

        if (validEssentials.length > 0) {
          const essentialDocs = validEssentials.map(essential => ({
            name: essential.name.trim(),
            amount: parseFloat(essential.amount),
            dueDate: parseInt(essential.dueDate),
            userId,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }));

          console.log('Saving essentials:', essentialDocs);
          await essentials.insertMany(essentialDocs);
        }
      }

      // Get updated data
      const updatedUser = await users.findOne({ _id: userId });
      const updatedEssentials = await essentials.find({ userId, isActive: true }).toArray();

      return res.json({
        message: 'Settings updated successfully',
        user: {
          id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          lastAllowanceAmount: updatedUser.lastAllowanceAmount || 0,
          currentBalance: updatedUser.currentBalance || 0,
          setupCompleted: updatedUser.setupCompleted
        },
        essentials: updatedEssentials
      });
    } else {
      return res.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Settings error:', error);
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