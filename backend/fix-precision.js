const mongoose =makrequire('mongoose');
require('dotenv').config();this

const AllowanceTopup = require('./models/AllowanceTopup');
const User = require('./models/User');

async function fixPrecision() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pocketa', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Find and fix 499.98 -> 500
    const topupsToFix = await AllowanceTopup.find({
      amount: 499.98
    });

    console.log(`Found ${topupsToFix.length} topups with 499.98`);

    for (const topup of topupsToFix) {
      console.log(`Fixing topup ${topup._id}: ${topup.amount} -> 500`);
      topup.amount = 500;
      topup.originalAmount = 500;
      topup.remaining = 500 - topup.spent;
      await topup.save();
    }

    // Update user balances
    const users = await User.find({});
    for (const user of users) {
      const activeTopup = await AllowanceTopup.findOne({
        userId: user._id,
        remaining: { $gt: 0 }
      }).sort({ createdAt: -1 });

      if (activeTopup) {
        user.currentBalance = activeTopup.remaining;
        await user.save();
        console.log(`Updated user ${user.email} balance to ${activeTopup.remaining}`);
      }
    }

    console.log('Precision fix completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixPrecision();