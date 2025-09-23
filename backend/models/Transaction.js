const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
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
  description: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Essentials', 'Allowance', 'Extra']
  },
  // Link to specific allowance top-up for allowance expenses
  allowanceTopupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AllowanceTopup',
    required: function() {
      return this.category === 'Allowance';
    }
  },
  date: {
    type: Date,
    default: Date.now
  },
  type: {
    type: String,
    enum: ['expense', 'income'],
    default: 'expense'
  }
}, {
  timestamps: true
});

transactionSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);