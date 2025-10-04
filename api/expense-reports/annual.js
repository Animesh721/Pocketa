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
    // Get year from query parameters
    const { year: yearParam } = req.query;
    const year = parseInt(yearParam);

    if (!year || year < 2020 || year > 2030) {
      return res.status(400).json({ message: 'Invalid year' });
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

    // Get data for entire year
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

    const yearlyTransactions = await transactions.find({
      userId,
      date: { $gte: yearStart, $lte: yearEnd }
    }).toArray();

    const yearlyAllowances = await allowances.find({
      userId,
      createdAt: { $gte: yearStart, $lte: yearEnd }
    }).toArray();

    // Calculate totals
    const totalExpenses = yearlyTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalAllowance = yearlyAllowances.reduce((sum, a) => sum + (a.amount || 0), 0);

    // Get allowance-only spending
    const allowanceSpending = yearlyTransactions
      .filter(t => t.category === 'Allowance')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalSavings = Math.max(0, totalAllowance - allowanceSpending);

    // Category breakdown
    const categoryBreakdown = {
      'Allowance': 0,
      'Essentials': 0,
      'Extra': 0
    };

    yearlyTransactions.forEach(t => {
      const category = t.category || 'Allowance';
      if (categoryBreakdown.hasOwnProperty(category)) {
        categoryBreakdown[category] += t.amount || 0;
      }
    });

    // Monthly breakdown
    const monthlyData = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const monthsToProcess = year === currentYear ? currentMonth : 12;

    let highestSpendingMonth = { monthName: 'N/A', totalExpenses: 0 };
    let lowestSpendingMonth = { monthName: 'N/A', totalExpenses: Infinity };

    for (let month = 1; month <= monthsToProcess; month++) {
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

      const monthTransactions = yearlyTransactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate >= monthStart && tDate <= monthEnd;
      });

      const monthExpenses = monthTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
      const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short' });

      monthlyData.push({
        month,
        monthName,
        totalExpenses: Math.round(monthExpenses * 100) / 100
      });

      // Track highest and lowest
      if (monthExpenses > highestSpendingMonth.totalExpenses) {
        highestSpendingMonth = {
          monthName: new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long' }),
          totalExpenses: monthExpenses
        };
      }

      if (monthExpenses < lowestSpendingMonth.totalExpenses && monthExpenses > 0) {
        lowestSpendingMonth = {
          monthName: new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long' }),
          totalExpenses: monthExpenses
        };
      }
    }

    // Calculate average monthly spending
    const averageMonthlySpending = monthsToProcess > 0 ? totalExpenses / monthsToProcess : 0;

    // Find most spent category
    let mostSpentCategory = 'Allowance';
    let maxAmount = 0;
    Object.keys(categoryBreakdown).forEach(category => {
      if (categoryBreakdown[category] > maxAmount) {
        maxAmount = categoryBreakdown[category];
        mostSpentCategory = category;
      }
    });

    return res.json({
      year,
      summary: {
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        totalAllowance: Math.round(totalAllowance * 100) / 100,
        totalSavings: Math.round(totalSavings * 100) / 100,
        averageMonthlySpending: Math.round(averageMonthlySpending * 100) / 100
      },
      categoryBreakdown,
      monthlyData,
      insights: {
        highestSpendingMonth,
        lowestSpendingMonth,
        totalMonthsTracked: monthsToProcess,
        mostSpentCategory
      }
    });

  } catch (error) {
    console.error('Annual report error:', error);
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
