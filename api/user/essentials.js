const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
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
    console.log('Connecting to MongoDB for essentials...');
    client = new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 5000,
    });

    await client.connect();
    console.log('Connected to MongoDB successfully');

    const db = client.db('pocketa');
    const essentials = db.collection('essentials');

    if (req.method === 'GET') {
      // Get all active essentials for the user
      const userEssentials = await essentials.find({ userId, isActive: true }).toArray();
      return res.json(userEssentials);

    } else if (req.method === 'POST') {
      // Add a new essential
      const { name, amount, dueDate } = req.body;

      // Validation
      if (!name || !name.trim()) {
        return res.status(400).json({ message: 'Essential name is required' });
      }

      if (!amount || parseFloat(amount) <= 0) {
        return res.status(400).json({ message: 'Amount must be greater than 0' });
      }

      if (!dueDate || parseInt(dueDate) < 1 || parseInt(dueDate) > 31) {
        return res.status(400).json({ message: 'Due date must be between 1 and 31' });
      }

      console.log('Adding new essential...');

      // Create new essential
      const newEssential = {
        name: name.trim(),
        amount: parseFloat(amount),
        dueDate: parseInt(dueDate),
        userId,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await essentials.insertOne(newEssential);

      // Get all essentials for the user
      const allEssentials = await essentials.find({ userId, isActive: true }).toArray();

      console.log('Essential added successfully');

      return res.status(201).json({
        message: 'Essential added successfully',
        essential: newEssential,
        allEssentials
      });

    } else if (req.method === 'DELETE') {
      // Delete an essential
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ message: 'Essential ID is required' });
      }

      await essentials.updateOne(
        { _id: new ObjectId(id), userId },
        { $set: { isActive: false, updatedAt: new Date() } }
      );

      // Get remaining essentials
      const allEssentials = await essentials.find({ userId, isActive: true }).toArray();

      return res.json({
        message: 'Essential deleted successfully',
        allEssentials
      });

    } else {
      return res.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Essentials API error:', error);
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
