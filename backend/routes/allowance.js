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
    const totalAllowanceAmount = parseFloat(amount) + totalPreviousRemaining;

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
      originalAmount: parseFloat(amount), // Track the original amount received
      carryOverAmount: totalPreviousRemaining // Track how much was carried over
    });

    await topup.save();

    // Update user's current balance
    const user = await User.findById(req.user._id);
    user.currentBalance = totalAllowanceAmount; // Set to total available balance
    user.lastAllowanceAmount = parseFloat(amount); // Keep track of last received amount only
    await user.save();

    res.json({
      message: totalPreviousRemaining > 0
        ? `Allowance top-up added successfully with ₹${totalPreviousRemaining.toLocaleString()} carry-over from previous allowances`
        : 'Allowance top-up added successfully',
      topup,
      newBalance: user.currentBalance,
      carryOverAmount: totalPreviousRemaining,
      originalAmount: parseFloat(amount),
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
      const user = await User.findById(req.user._id);
      user.currentBalance = 0;
      await user.save();

      return res.json({
        message: 'No active allowances. Balance set to 0.',
        currentBalance: 0
      });
    }

    // Recalculate spent amounts for each topup by summing transactions
    let totalRemainingBalance = 0;

    for (const topup of activeTopups) {
      // Get all transactions for this topup
      const transactions = await Transaction.find({
        allowanceTopupId: topup._id,
        category: 'Allowance',
        type: 'expense'
      });

      const actualSpent = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);

      // Update the topup with correct spent amount
      topup.spent = actualSpent;
      await topup.save(); // This will trigger pre-save middleware to recalculate remaining

      if (topup.remaining > 0) {
        totalRemainingBalance += topup.remaining;
      }
    }

    // Update user's current balance to match the total remaining
    const user = await User.findById(req.user._id);
    user.currentBalance = totalRemainingBalance;
    await user.save();

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