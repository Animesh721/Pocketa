const express = require('express');
const auth = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const AllowanceTopup = require('../models/AllowanceTopup');
const User = require('../models/User');

const router = express.Router();

// Monthly reset function
async function performMonthlyReset(userId) {
  try {
    console.log(`Starting monthly reset for user: ${userId}`);

    // Delete all transactions for the user
    const deletedTransactions = await Transaction.deleteMany({ userId });
    console.log(`Deleted ${deletedTransactions.deletedCount} transactions for user: ${userId}`);

    // Reset all allowance topups to their original state
    const allowanceTopups = await AllowanceTopup.find({ userId });

    for (const topup of allowanceTopups) {
      // Reset spending and reactivate
      topup.spent = 0;
      topup.remaining = topup.amount;
      topup.isActive = topup.amount > 0;
      topup.depletedDate = null;
      topup.daysLasted = null;
      await topup.save();
    }

    // Update user balance to total of all allowances
    const totalAllowanceAmount = allowanceTopups.reduce((sum, topup) => sum + topup.amount, 0);
    const user = await User.findById(userId);
    if (user) {
      user.currentBalance = totalAllowanceAmount;
      await user.save();
    }

    console.log(`Monthly reset completed for user: ${userId}`);
    return {
      deletedTransactions: deletedTransactions.deletedCount,
      resetAllowances: allowanceTopups.length,
      newBalance: totalAllowanceAmount
    };
  } catch (error) {
    console.error(`Monthly reset error for user ${userId}:`, error);
    throw error;
  }
}

// Manual monthly reset endpoint
router.post('/reset-current-month', auth, async (req, res) => {
  try {
    const result = await performMonthlyReset(req.user._id);

    res.json({
      message: 'Monthly reset completed successfully',
      ...result
    });
  } catch (error) {
    console.error('Manual monthly reset error:', error);
    res.status(500).json({ message: 'Monthly reset failed', error: error.message });
  }
});

// Reset all users (admin endpoint)
router.post('/reset-all-users', async (req, res) => {
  try {
    const users = await User.find({});
    let resetCount = 0;
    let errors = [];

    for (const user of users) {
      try {
        await performMonthlyReset(user._id);
        resetCount++;
      } catch (error) {
        errors.push({ userId: user._id, email: user.email, error: error.message });
      }
    }

    res.json({
      message: `Monthly reset completed for ${resetCount} users`,
      resetCount,
      totalUsers: users.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Bulk monthly reset error:', error);
    res.status(500).json({ message: 'Bulk monthly reset failed', error: error.message });
  }
});

// Check if current month needs reset
router.get('/check-reset-needed', auth, async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Find the most recent transaction
    const latestTransaction = await Transaction.findOne({
      userId: req.user._id
    }).sort({ date: -1 });

    let needsReset = false;

    if (latestTransaction) {
      const latestDate = new Date(latestTransaction.date);
      const latestMonth = latestDate.getMonth();
      const latestYear = latestDate.getFullYear();

      // If the latest transaction is from a previous month/year, reset is needed
      needsReset = (latestYear < currentYear) || (latestYear === currentYear && latestMonth < currentMonth);
    }

    res.json({
      needsReset,
      currentMonth: currentMonth + 1, // Convert to 1-based month
      currentYear,
      latestTransactionDate: latestTransaction?.date || null
    });
  } catch (error) {
    console.error('Check reset needed error:', error);
    res.status(500).json({ message: 'Error checking reset status', error: error.message });
  }
});

// Get monthly reset statistics
router.get('/reset-stats', auth, async (req, res) => {
  try {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Count transactions in current month
    const currentMonthTransactions = await Transaction.countDocuments({
      userId: req.user._id,
      date: { $gte: currentMonthStart }
    });

    // Get total spending in current month
    const currentMonthSpending = await Transaction.aggregate([
      {
        $match: {
          userId: req.user._id,
          date: { $gte: currentMonthStart },
          type: 'expense'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const totalSpending = currentMonthSpending.length > 0 ? currentMonthSpending[0].total : 0;

    res.json({
      currentMonth: now.getMonth() + 1,
      currentYear: now.getFullYear(),
      transactionsThisMonth: currentMonthTransactions,
      totalSpendingThisMonth: totalSpending,
      monthStartDate: currentMonthStart
    });
  } catch (error) {
    console.error('Reset stats error:', error);
    res.status(500).json({ message: 'Error getting reset statistics', error: error.message });
  }
});

module.exports = { router, performMonthlyReset };