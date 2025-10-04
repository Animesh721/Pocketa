const { MongoClient } = require('mongodb');

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  let client;

  try {
    console.log('Testing MongoDB connection...');
    console.log('MongoDB URI exists:', !!process.env.MONGODB_URI);
    console.log('MongoDB URI preview:', process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 20) + '...' : 'MISSING');

    // Test connection
    client = new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // 5 second timeout for quick test
      socketTimeoutMS: 5000,
    });

    await client.connect();
    console.log('MongoDB connection successful');

    // Test database access
    const db = client.db('pocketa');
    const collections = await db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));

    // Test a simple query
    const users = db.collection('users');
    const userCount = await users.countDocuments();

    return res.status(200).json({
      status: 'healthy',
      database: 'connected',
      collections: collections.map(c => c.name),
      userCount: userCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Database health check failed:', error);

    return res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: error.message,
      code: error.code || 'UNKNOWN',
      timestamp: new Date().toISOString(),
      mongoUriExists: !!process.env.MONGODB_URI
    });
  } finally {
    if (client) {
      try {
        await client.close();
      } catch (closeError) {
        console.error('Error closing connection:', closeError);
      }
    }
  }
}