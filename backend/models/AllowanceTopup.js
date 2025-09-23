const mongoose = require('mongoose');

const allowanceTopupSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  requestDate: {
    type: Date,
    default: Date.now
  },
  receivedDate: {
    type: Date,
    default: Date.now
  },
  description: {
    type: String,
    default: 'Allowance top-up'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Track spending against this specific top-up
  spent: {
    type: Number,
    default: 0
  },
  remaining: {
    type: Number,
    default: 0
  },
  // Track when this allowance was completely used up
  depletedDate: {
    type: Date,
    default: null
  },
  // Calculate how many days this allowance lasted
  daysLasted: {
    type: Number,
    default: null
  },
  // Track the original amount received (before carry-over)
  originalAmount: {
    type: Number,
    default: 0
  },
  // Track how much was carried over from previous allowances
  carryOverAmount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Pre-save middleware to calculate remaining and track depletion
allowanceTopupSchema.pre('save', function(next) {
  this.remaining = this.amount - this.spent;

  // Check if allowance just got depleted (remaining <= 0 and wasn't depleted before)
  if (this.remaining <= 0 && !this.depletedDate && this.spent > 0) {
    this.depletedDate = new Date();

    // Calculate how many days this allowance lasted
    const startDate = this.receivedDate || this.createdAt;
    const endDate = this.depletedDate;
    const timeDiff = endDate.getTime() - startDate.getTime();
    this.daysLasted = Math.ceil(timeDiff / (1000 * 3600 * 24));

    // Mark as inactive since it's depleted
    this.isActive = false;
  }

  next();
});

module.exports = mongoose.model('AllowanceTopup', allowanceTopupSchema);