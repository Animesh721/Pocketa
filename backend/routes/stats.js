const express = require('express');
const auth = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const Essential = require('../models/Essential');
const User = require('../models/User');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const essentials = await Essential.find({ userId: req.user._id, isActive: true });

    const now = new Date();
    let periodStart, periodEnd;

    if (user.allowanceFrequency === 'weekly') {
      const dayOfWeek = now.getDay();
      const daysToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
      periodEnd = new Date(now);
      periodEnd.setDate(now.getDate() + daysToSunday);
      periodEnd.setHours(23, 59, 59, 999);

      periodStart = new Date(periodEnd);
      periodStart.setDate(periodEnd.getDate() - 6);
      periodStart.setHours(0, 0, 0, 0);
    } else {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const [allowanceSpent, essentialsSpent, extraSpent, categoryBreakdown] = await Promise.all([
      Transaction.aggregate([
        {
          $match: {
            userId: req.user._id,
            category: 'Allowance',
            type: 'expense',
            date: { $gte: periodStart, $lte: periodEnd }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]),

      Transaction.aggregate([
        {
          $match: {
            userId: req.user._id,
            category: 'Essentials',
            type: 'expense',
            date: { $gte: periodStart, $lte: periodEnd }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]),

      Transaction.aggregate([
        {
          $match: {
            userId: req.user._id,
            category: 'Extra',
            type: 'expense',
            date: { $gte: periodStart, $lte: periodEnd }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]),

      Transaction.aggregate([
        {
          $match: {
            userId: req.user._id,
            type: 'expense',
            date: { $gte: periodStart, $lte: periodEnd }
          }
        },
        {
          $group: {
            _id: '$category',
            total: { $sum: '$amount' }
          }
        }
      ])
    ]);

    const totalEssentials = essentials.reduce((sum, essential) => sum + essential.amount, 0);
    const allowanceSpentAmount = allowanceSpent[0]?.total || 0;
    const essentialsSpentAmount = essentialsSpent[0]?.total || 0;
    const extraSpentAmount = extraSpent[0]?.total || 0;

    const stats = {
      currentPeriod: {
        start: periodStart,
        end: periodEnd,
        type: user.allowanceFrequency
      },
      allowance: {
        budget: user.allowanceAmount,
        spent: allowanceSpentAmount,
        remaining: user.allowanceAmount - allowanceSpentAmount
      },
      essentials: {
        budget: totalEssentials,
        spent: essentialsSpentAmount,
        remaining: totalEssentials - essentialsSpentAmount,
        items: essentials
      },
      extra: {
        spent: extraSpentAmount
      },
      categoryBreakdown: categoryBreakdown.reduce((acc, cat) => {
        acc[cat._id] = cat.total;
        return acc;
      }, {}),
      totalSpent: allowanceSpentAmount + essentialsSpentAmount + extraSpentAmount
    };

    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;