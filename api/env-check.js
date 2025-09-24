export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    return res.status(200).json({
      success: true,
      environment: {
        MONGODB_URI: process.env.MONGODB_URI ? 'Set' : 'Not Set',
        JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'Not Set',
        NODE_ENV: process.env.NODE_ENV || 'Not Set',
        mongoUriLength: process.env.MONGODB_URI ? process.env.MONGODB_URI.length : 0,
        mongoUriPrefix: process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 20) + '...' : 'N/A'
      }
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Environment check failed',
      message: error.message
    });
  }
}