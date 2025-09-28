const cron = require('node-cron');
const User = require('../models/User');
const { performMonthlyReset } = require('../routes/monthly-reset');

// Schedule monthly reset for all users at 23:59 on the last day of every month
// Cron expression: '59 23 28-31 * *' = At 23:59 on day 28-31 of every month
function startMonthlyResetScheduler() {
  console.log('📅 Monthly reset scheduler starting...');

  // Run at 23:59 on the 28th, 29th, 30th, and 31st of every month
  // This ensures it runs on the last possible days of any month
  cron.schedule('59 23 28-31 * *', async () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);

    // Only run if tomorrow is the first day of next month (i.e., today is the last day)
    if (tomorrow.getDate() === 1) {
      console.log('🗓️ Starting automatic monthly reset for all users at 23:59 on last day of month...');

    try {
      const users = await User.find({});
      let successCount = 0;
      let errorCount = 0;

      console.log(`Found ${users.length} users to reset`);

      for (const user of users) {
        try {
          const result = await performMonthlyReset(user._id);
          console.log(`✅ Reset completed for user ${user.email}: ${result.deletedTransactions} transactions deleted, ${result.resetAllowances} allowances reset`);
          successCount++;
        } catch (error) {
          console.error(`❌ Reset failed for user ${user.email}:`, error.message);
          errorCount++;
        }
      }

      console.log(`🎉 Monthly reset completed: ${successCount} successful, ${errorCount} failed`);
    } catch (error) {
      console.error('❌ Monthly reset scheduler error:', error);
    }
    }
  });

  // Optional: Check and reset at app startup if needed (for missed resets)
  checkAndResetIfNeeded();

  console.log('✅ Monthly reset scheduler is now running');
}

// Check if any users need reset at startup (in case server was down during scheduled reset)
async function checkAndResetIfNeeded() {
  try {
    console.log('🔍 Checking if any users need monthly reset...');

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const currentMonthStart = new Date(currentYear, currentMonth, 1);

    const users = await User.find({});
    let resetCount = 0;

    for (const user of users) {
      // Check if user has any transactions from the current month
      const Transaction = require('../models/Transaction');
      const currentMonthTransactions = await Transaction.findOne({
        userId: user._id,
        date: { $gte: currentMonthStart }
      });

      // If no transactions in current month, check if they have transactions from previous months
      if (!currentMonthTransactions) {
        const anyPreviousTransactions = await Transaction.findOne({
          userId: user._id,
          date: { $lt: currentMonthStart }
        });

        // If they have previous transactions but none in current month, reset them
        if (anyPreviousTransactions) {
          try {
            const result = await performMonthlyReset(user._id);
            console.log(`🔄 Startup reset for user ${user.email}: ${result.deletedTransactions} transactions deleted`);
            resetCount++;
          } catch (error) {
            console.error(`❌ Startup reset failed for user ${user.email}:`, error.message);
          }
        }
      }
    }

    if (resetCount > 0) {
      console.log(`🎯 Startup check: Reset ${resetCount} users who needed monthly reset`);
    } else {
      console.log('✅ Startup check: All users are up to date, no resets needed');
    }
  } catch (error) {
    console.error('❌ Startup reset check error:', error);
  }
}

// Test function to manually trigger reset (for testing)
function triggerTestReset() {
  console.log('🧪 Triggering test monthly reset...');

  setTimeout(async () => {
    try {
      const users = await User.find({});
      console.log(`Testing reset for ${users.length} users`);

      for (const user of users) {
        try {
          const result = await performMonthlyReset(user._id);
          console.log(`Test reset for ${user.email}: ${result.deletedTransactions} transactions deleted`);
        } catch (error) {
          console.error(`Test reset failed for ${user.email}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Test reset error:', error);
    }
  }, 5000); // 5 second delay
}

module.exports = {
  startMonthlyResetScheduler,
  checkAndResetIfNeeded,
  triggerTestReset
};