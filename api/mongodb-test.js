const mongoose = require('mongoose');

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Try to connect with detailed error handling
    const connectionOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 5,
    };

    console.log('Attempting MongoDB connection...');
    console.log('Connection options:', connectionOptions);
    console.log('MongoDB URI prefix:', process.env.MONGODB_URI?.substring(0, 50) + '...');

    await mongoose.connect(process.env.MONGODB_URI, connectionOptions);

    console.log('MongoDB connection successful');

    // Test a simple operation
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    return res.status(200).json({
      success: true,
      message: 'MongoDB connection successful',
      connectionState: mongoose.connection.readyState,
      databaseName: mongoose.connection.db.databaseName,
      collections: collections.map(c => c.name),
      host: mongoose.connection.host,
      port: mongoose.connection.port
    });

  } catch (error) {
    console.error('MongoDB connection failed:', error);

    return res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
      codeName: error.codeName,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 5), // First 5 lines of stack
      mongodbUri: process.env.MONGODB_URI ? 'Set' : 'Not Set',
      uriLength: process.env.MONGODB_URI?.length || 0
    });
  } finally {
    // Close connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  }
}