const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
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
    // Get month and year from query parameters
    const { month: monthParam, year: yearParam } = req.query;
    const month = parseInt(monthParam);
    const year = parseInt(yearParam);

    if (!month || !year || month < 1 || month > 12 || year < 2020 || year > 2030) {
      return res.status(400).json({ message: 'Invalid month or year' });
    }

    // Connect to MongoDB
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
    const allowances = db.collection('allowances');

    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Get all transactions for the month
    const monthlyTransactions = await transactions.find({
      userId,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ amount: -1 }).toArray();

    // Get allowance deposits for the month
    const monthlyAllowances = await allowances.find({
      userId,
      createdAt: { $gte: startDate, $lte: endDate }
    }).toArray();

    // Calculate totals
    const totalExpenses = monthlyTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalAllowance = monthlyAllowances.reduce((sum, a) => sum + (a.amount || 0), 0);

    // Get allowance-only spending for remaining calculation
    const allowanceSpending = monthlyTransactions
      .filter(t => t.category === 'Allowance')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const remainingAllowance = Math.max(0, totalAllowance - allowanceSpending);

    // Category breakdown
    const categoryBreakdown = {
      'Allowance': 0,
      'Essentials': 0,
      'Extra': 0
    };

    monthlyTransactions.forEach(t => {
      const category = t.category || 'Allowance';
      if (categoryBreakdown.hasOwnProperty(category)) {
        categoryBreakdown[category] += t.amount || 0;
      }
    });

    // Top 5 expenses
    const topExpenses = monthlyTransactions.slice(0, 5).map(t => ({
      description: t.description,
      amount: t.amount,
      category: t.category,
      date: t.date
    }));

    // Calculate daily average
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    let effectiveDays;
    if (year === currentYear && month === currentMonth) {
      effectiveDays = now.getDate();
    } else {
      const daysInMonth = new Date(year, month, 0).getDate();
      effectiveDays = daysInMonth;
    }

    const dailyAverage = effectiveDays > 0 ? totalExpenses / effectiveDays : 0;

    return res.json({
      month,
      year,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      totalAllowance: Math.round(totalAllowance * 100) / 100,
      remainingAllowance: Math.round(remainingAllowance * 100) / 100,
      categoryBreakdown,
      topExpenses,
      dailyAverage: Math.round(dailyAverage * 100) / 100,
      transactionCount: monthlyTransactions.length
    });

  } catch (error) {
    console.error('Monthly report error:', error);
    return res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
};
