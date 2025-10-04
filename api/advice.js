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

    // Get user and basic data for AI advice
    const users = db.collection('users');
    const transactions = db.collection('transactions');
    const allowances = db.collection('allowances');

    const user = await users.findOne({ _id: userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get current month data
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthlyTransactions = await transactions.find({
      userId,
      createdAt: { $gte: startOfMonth }
    }).toArray();

    const monthlyAllowances = await allowances.find({
      userId,
      createdAt: { $gte: startOfMonth }
    }).toArray();

    // Calculate spending by category
    const spendingByCategory = {
      'Allowance': 0,
      'Essentials': 0,
      'Extra': 0
    };

    monthlyTransactions.forEach(transaction => {
      const category = transaction.category || 'Allowance';
      if (spendingByCategory.hasOwnProperty(category)) {
        spendingByCategory[category] += transaction.amount || 0;
      }
    });

    const totalDeposits = monthlyAllowances.reduce((sum, a) => sum + (a.amount || 0), 0);
    const totalSpent = monthlyTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const allowanceRemaining = Math.max(0, totalDeposits - spendingByCategory['Allowance']);

    // Generate simple AI advice
    const tips = [];

    if (allowanceRemaining > 0) {
      const avgDailySpending = spendingByCategory['Allowance'] / Math.max(1, Math.ceil((now - startOfMonth) / (1000 * 60 * 60 * 24)));
      const projectedDays = avgDailySpending > 0 ? Math.floor(allowanceRemaining / avgDailySpending) : 0;

      tips.push(`💰 You have ₹${allowanceRemaining.toFixed(0)} remaining in your allowance.`);

      if (projectedDays > 0) {
        tips.push(`📊 At your current spending rate (₹${avgDailySpending.toFixed(0)}/day), your allowance should last ${projectedDays} more days.`);
      }

      if (projectedDays < 3 && projectedDays > 0) {
        tips.push(`⚠️ Your allowance is running low! Try to limit spending to ₹${Math.floor(allowanceRemaining / 5)}/day to extend it.`);
      } else if (projectedDays >= 7) {
        tips.push(`✅ Great job! Your allowance management is on track. Consider saving ₹${Math.floor(avgDailySpending * 0.2)}/day for emergencies.`);
      }
    } else {
      tips.push(`⚠️ You've exhausted your allowance for this month. Consider adding more funds or tracking expenses more carefully.`);
    }

    if (spendingByCategory['Extra'] > totalDeposits * 0.2) {
      tips.push(`💡 Your extra spending (₹${spendingByCategory['Extra'].toFixed(0)}) is high. Consider if these purchases are necessary.`);
    }

    if (monthlyTransactions.length > 0) {
      tips.push(`📈 You've made ${monthlyTransactions.length} transactions this month. Track daily to stay aware of your spending.`);
    }

    const aiAdvice = tips.join('\n\n');

    const summary = {
      allowance: {
        budget: totalDeposits,
        spent: spendingByCategory['Allowance'],
        remaining: allowanceRemaining
      },
      essentials: {
        spent: spendingByCategory['Essentials']
      },
      extra: {
        spent: spendingByCategory['Extra']
      },
      totalSpent: totalSpent,
      transactionsCount: monthlyTransactions.length
    };

    return res.json({
      advice: aiAdvice,
      summary: summary
    });

  } catch (error) {
    console.error('Advice API error:', error);
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
