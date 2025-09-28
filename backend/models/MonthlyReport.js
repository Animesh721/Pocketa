const mongoose = require('mongoose');

const monthlyReportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },
  // Financial summary
  totalExpenses: {
    type: Number,
    default: 0
  },
  totalAllowance: {
    type: Number,
    default: 0
  },
  remainingAllowance: {
    type: Number,
    default: 0
  },
  savingsRate: {
    type: Number,
    default: 0
  },
  // Category breakdown
  categoryBreakdown: {
    Allowance: { type: Number, default: 0 },
    Essentials: { type: Number, default: 0 },
    Extra: { type: Number, default: 0 }
  },
  // Top expenses
  topExpenses: [{
    description: String,
    amount: Number,
    category: String,
    date: Date
  }],
  // Spending patterns
  dailyAverage: {
    type: Number,
    default: 0
  },
  weeklyPattern: [{
    day: String, // Monday, Tuesday, etc.
    amount: Number
  }],
  // Goals and achievements
  budgetGoal: {
    type: Number,
    default: 0
  },
  goalAchieved: {
    type: Boolean,
    default: false
  },
  // Report generation info
  reportGenerated: {
    type: Boolean,
    default: false
  },
  generatedDate: {
    type: Date,
    default: null
  },
  // User notification status
  notificationSent: {
    type: Boolean,
    default: false
  },
  reportViewed: {
    type: Boolean,
    default: false
  },
  viewedDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
monthlyReportSchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('MonthlyReport', monthlyReportSchema);