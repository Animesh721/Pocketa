const express = require('express');
const auth = require('../middleware/auth');
const AllowanceTopup = require('../models/AllowanceTopup');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

const router = express.Router();

// Get all allowance top-ups for user
router.get('/', auth, async (req, res) => {
  try {
    const topups = await AllowanceTopup.find({ userId: req.user._id })
      .sort({ createdAt: -1 });

    res.json(topups);
  } catch (error) {
    console.error('Get allowance topups error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add new allowance top-up
router.post('/', auth, async (req, res) => {
  try {
    const { amount, description, receivedDate } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }

    // Calculate total remaining from all previous topups
    const previousTopups = await AllowanceTopup.find({
      userId: req.user._id,
      remaining: { $gt: 0 }
    });

    const totalPreviousRemaining = previousTopups.reduce((sum, topup) => sum + topup.remaining, 0);

    // The new allowance amount includes carry-over from previous allowances
    // Use Number() instead of parseFloat() and ensure proper rounding for currency
    const parsedAmount = Number(amount);
    const totalAllowanceAmount = Math.round((parsedAmount + totalPreviousRemaining) * 100) / 100;

    // Mark all previous topups as depleted since we're carrying over their balance
    if (previousTopups.length > 0) {
      await AllowanceTopup.updateMany(
        {
          userId: req.user._id,
          remaining: { $gt: 0 }
        },
        {
          remaining: 0,
          depletedDate: new Date(),
          isActive: false
        }
      );
    }

    const topup = new AllowanceTopup({
      userId: req.user._id,
      amount: totalAllowanceAmount, // This now includes carry-over
      description: totalPreviousRemaining > 0
        ? `${description || 'Allowance top-up'} (includes ₹${totalPreviousRemaining.toLocaleString()} carry-over)`
        : description || 'Allowance top-up',
      receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
      remaining: totalAllowanceAmount,
      spent: 0,
      originalAmount: parsedAmount, // Track the original amount received
      carryOverAmount: totalPreviousRemaining // Track how much was carried over
    });

    await topup.save();

    // Update user's current balance
    const user = await User.findById(req.user._id);
    user.currentBalance = totalAllowanceAmount; // Set to total available balance
    user.lastAllowanceAmount = parsedAmount; // Keep track of last received amount only
    await user.save();

    res.json({
      message: totalPreviousRemaining > 0
        ? `Allowance top-up added successfully with ₹${totalPreviousRemaining.toLocaleString()} carry-over from previous allowances`
        : 'Allowance top-up added successfully',
      topup,
      newBalance: user.currentBalance,
      carryOverAmount: totalPreviousRemaining,
      originalAmount: parsedAmount,
      totalAmount: totalAllowanceAmount
    });
  } catch (error) {
    console.error('Add allowance topup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current active allowance (latest top-up with remaining balance)
router.get('/current', auth, async (req, res) => {
  try {
    const activeTopup = await AllowanceTopup.findOne({
      userId: req.user._id,
      remaining: { $gt: 0 }
    }).sort({ createdAt: -1 });

    // Debug logging
    console.log('DEBUG - Current allowance request for user:', req.user._id);
    if (activeTopup) {
      console.log('DEBUG - Active topup found:', {
        id: activeTopup._id,
        amount: activeTopup.amount,
        spent: activeTopup.spent,
        remaining: activeTopup.remaining,
        originalAmount: activeTopup.originalAmount,
        carryOverAmount: activeTopup.carryOverAmount
      });
    } else {
      const allTopups = await AllowanceTopup.find({ userId: req.user._id }).sort({ createdAt: -1 });
      console.log('DEBUG - No active topup found. All topups:', allTopups.map(t => ({
        id: t._id,
        amount: t.amount,
        spent: t.spent,
        remaining: t.remaining,
        isActive: t.isActive
      })));
    }

    if (!activeTopup) {
      return res.json({
        hasActiveAllowance: false,
        message: 'No active allowance. Request a new top-up from parents.'
      });
    }

    res.json({
      hasActiveAllowance: true,
      currentTopup: activeTopup
    });
  } catch (error) {
    console.error('Get current allowance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get allowance history with spending details
router.get('/history', auth, async (req, res) => {
  try {
    const topups = await AllowanceTopup.find({ userId: req.user._id })
      .sort({ createdAt: -1 });

    // Get expenses for each top-up
    const topupsWithExpenses = await Promise.all(
      topups.map(async (topup) => {
        const expenses = await Transaction.find({
          userId: req.user._id,
          allowanceTopupId: topup._id,
          category: 'Allowance'
        }).sort({ date: -1 });

        return {
          ...topup.toObject(),
          expenses,
          expenseCount: expenses.length
        };
      })
    );

    res.json(topupsWithExpenses);
  } catch (error) {
    console.error('Get allowance history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Utility endpoint to recalculate and sync balances (for fixing existing discrepancies)
router.post('/sync-balance', auth, async (req, res) => {
  try {
    // Get all active topups for the user
    const activeTopups = await AllowanceTopup.find({
      userId: req.user._id,
      remaining: { $gt: 0 }
    }).sort({ createdAt: -1 });

    if (activeTopups.length === 0) {
      // Try to find the most recent allowance topup to reactivate
      const latestTopup = await AllowanceTopup.findOne({
        userId: req.user._id
      }).sort({ createdAt: -1 });

      if (!latestTopup) {
        const user = await User.findById(req.user._id);
        user.currentBalance = 0;
        await user.save();

        return res.json({
          message: 'No allowances found. Balance set to 0.',
          currentBalance: 0
        });
      }

      // Reactivate the latest topup and recalculate its balance
      console.log('Reactivating latest topup:', latestTopup._id);

      // Get transactions since this topup was created
      const transactionsSinceAllowance = await Transaction.find({
        userId: req.user._id,
        type: 'expense',
        date: { $gte: latestTopup.createdAt }
      });

      const totalSpentSinceAllowance = transactionsSinceAllowance.reduce((sum, transaction) => sum + transaction.amount, 0);
      const newRemaining = Math.max(0, latestTopup.amount - totalSpentSinceAllowance);

      // Update the topup
      latestTopup.spent = totalSpentSinceAllowance;
      latestTopup.remaining = newRemaining;
      latestTopup.isActive = newRemaining > 0;
      await latestTopup.save();

      // Update user balance
      const user = await User.findById(req.user._id);
      user.currentBalance = newRemaining;
      await user.save();

      console.log('Reactivated allowance debug:', {
        topupAmount: latestTopup.amount,
        totalSpentSinceAllowance,
        newRemaining,
        isActive: latestTopup.isActive,
        transactionsCount: transactionsSinceAllowance.length
      });

      return res.json({
        message: `Allowance reactivated! Recalculated balance: ₹${newRemaining}`,
        currentBalance: newRemaining
      });
    }

    // Get the most recent active topup to use as the baseline date
    const latestTopup = activeTopups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

    // Get ALL expense transactions since the latest allowance topup was created
    const transactionsSinceAllowance = await Transaction.find({
      userId: req.user._id,
      type: 'expense',
      date: { $gte: latestTopup.createdAt }
    });

    const totalSpentSinceAllowance = transactionsSinceAllowance.reduce((sum, transaction) => sum + transaction.amount, 0);
    const totalAllowanceAmount = activeTopups.reduce((sum, topup) => sum + topup.amount, 0);

    // Update each topup with spent amount since allowance
    for (const topup of activeTopups) {
      topup.spent = totalSpentSinceAllowance; // Assign spending since allowance to all active topups
      await topup.save();
    }

    // Calculate final remaining balance: total allowance - total spent since allowance
    const finalRemainingBalance = Math.max(0, totalAllowanceAmount - totalSpentSinceAllowance);

    // Update user's current balance
    const user = await User.findById(req.user._id);
    user.currentBalance = finalRemainingBalance;
    await user.save();

    console.log('Sync Balance Debug:', {
      totalAllowanceAmount,
      totalSpentSinceAllowance,
      finalRemainingBalance,
      activeTopupsCount: activeTopups.length,
      latestTopupCreatedAt: latestTopup.createdAt,
      transactionsSinceAllowanceCount: transactionsSinceAllowance.length,
      transactionsSinceAllowance: transactionsSinceAllowance.map(t => ({
        amount: t.amount,
        category: t.category,
        description: t.description,
        date: t.date
      }))
    });

    res.json({
      message: 'Balances synchronized successfully',
      currentBalance: user.currentBalance,
      activeTopupsCount: activeTopups.filter(t => t.remaining > 0).length
    });
  } catch (error) {
    console.error('Sync balance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Database repair endpoint to fix existing balance issues
router.post('/repair-balances', async (req, res) => {
  try {
    const users = await User.find({});
    let fixedUsers = 0;

    for (const user of users) {
      // Get all active topups for this user
      const activeTopups = await AllowanceTopup.find({
        userId: user._id,
        remaining: { $gt: 0 }
      }).sort({ createdAt: 1 }); // Oldest first

      if (activeTopups.length > 1) {
        console.log(`Fixing ${activeTopups.length} topups for user ${user.email}`);

        // Calculate total remaining from all topups
        const totalRemaining = activeTopups.reduce((sum, topup) => sum + topup.remaining, 0);
        const totalAmount = activeTopups.reduce((sum, topup) => sum + topup.amount, 0);
        const totalSpent = totalAmount - totalRemaining;

        // Keep the most recent topup and consolidate everything into it
        const latestTopup = activeTopups[activeTopups.length - 1];

        // Update the latest topup with consolidated amounts
        latestTopup.amount = totalAmount;
        latestTopup.spent = totalSpent;
        latestTopup.remaining = totalRemaining;
        latestTopup.carryOverAmount = activeTopups.slice(0, -1).reduce((sum, topup) => sum + topup.remaining, 0);
        latestTopup.description = `Consolidated allowance (${activeTopups.length} topups merged)`;
        await latestTopup.save();

        // Mark all other topups as depleted/inactive
        for (let i = 0; i < activeTopups.length - 1; i++) {
          const oldTopup = activeTopups[i];
          oldTopup.remaining = 0;
          oldTopup.isActive = false;
          oldTopup.depletedDate = new Date();
          await oldTopup.save();
        }

        // Update user's current balance
        user.currentBalance = totalRemaining;
        await user.save();

        fixedUsers++;
      }
    }

    res.json({
      message: `Database repair completed. Fixed ${fixedUsers} users.`,
      fixedUsers
    });
  } catch (error) {
    console.error('Repair error:', error);
    res.status(500).json({ message: 'Repair error', error: error.message });
  }
});

// Quick fix endpoint for precision issues
router.post('/fix-precision', auth, async (req, res) => {
  try {
    const activeTopup = await AllowanceTopup.findOne({
      userId: req.user._id,
      remaining: { $gt: 0 }
    }).sort({ createdAt: -1 });

    if (!activeTopup) {
      return res.status(404).json({ message: 'No active allowance found' });
    }

    // Fix precision issues by rounding to 2 decimal places
    activeTopup.amount = Math.round(activeTopup.amount * 100) / 100;
    activeTopup.spent = Math.round(activeTopup.spent * 100) / 100;
    activeTopup.remaining = Math.round(activeTopup.remaining * 100) / 100;

    // If original amount was meant to be 300, fix it
    if (activeTopup.amount === 299.98) {
      activeTopup.amount = 300;
      activeTopup.originalAmount = 300;
      activeTopup.remaining = 300 - activeTopup.spent;
    }

    // If original amount was meant to be 500, fix it
    if (activeTopup.amount === 499.98) {
      activeTopup.amount = 500;
      activeTopup.originalAmount = 500;
      activeTopup.remaining = 500 - activeTopup.spent;
    }

    await activeTopup.save();

    // Update user balance
    const user = await User.findById(req.user._id);
    user.currentBalance = activeTopup.remaining;
    await user.save();

    res.json({
      message: 'Precision issues fixed',
      allowance: {
        amount: activeTopup.amount,
        spent: activeTopup.spent,
        remaining: activeTopup.remaining
      }
    });
  } catch (error) {
    console.error('Fix precision error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Emergency fix for 499.98 -> 500
router.post('/emergency-fix', auth, async (req, res) => {
  try {
    // Find and fix all topups with 499.98
    const topupsToFix = await AllowanceTopup.find({
      userId: req.user._id,
      amount: 499.98
    });

    let fixedCount = 0;
    for (const topup of topupsToFix) {
      topup.amount = 500;
      topup.originalAmount = 500;
      topup.remaining = 500 - topup.spent;
      await topup.save();
      fixedCount++;
    }

    // Update user balance
    const user = await User.findById(req.user._id);
    const activeTopup = await AllowanceTopup.findOne({
      userId: req.user._id,
      remaining: { $gt: 0 }
    }).sort({ createdAt: -1 });

    if (activeTopup) {
      user.currentBalance = activeTopup.remaining;
      await user.save();
    }

    res.json({
      message: 'Emergency fix applied',
      fixedCount: fixedCount
    });
  } catch (error) {
    console.error('Emergency fix error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Debug endpoint to check database state (temporary)
router.get('/debug', async (req, res) => {
  try {
    // Get all users and their allowances for debugging
    const users = await User.find({});
    const topups = await AllowanceTopup.find({}).sort({ createdAt: -1 });
    const transactions = await Transaction.find({ category: 'Allowance' }).sort({ date: -1 });

    console.log('DEBUG - Database state:');
    console.log('Users:', users.map(u => ({ id: u._id, email: u.email, currentBalance: u.currentBalance })));
    console.log('Topups:', topups.map(t => ({
      id: t._id,
      userId: t.userId,
      amount: t.amount,
      spent: t.spent,
      remaining: t.remaining,
      isActive: t.isActive
    })));
    console.log('Allowance Transactions:', transactions.map(t => ({
      id: t._id,
      userId: t.userId,
      amount: t.amount,
      description: t.description,
      allowanceTopupId: t.allowanceTopupId
    })));

    res.json({
      users: users.length,
      topups: topups.length,
      transactions: transactions.length,
      data: { users, topups, transactions }
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ message: 'Debug error' });
  }
});

module.exports = router;