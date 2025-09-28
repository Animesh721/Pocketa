const express = require('express');
const auth = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const AllowanceTopup = require('../models/AllowanceTopup');
const MonthlyReport = require('../models/MonthlyReport');
const User = require('../models/User');

const router = express.Router();

// Generate monthly report for a specific month/year
async function generateMonthlyReport(userId, month, year) {
  try {
    console.log(`Generating monthly report for user ${userId}, ${month}/${year}`);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Get all transactions for the month
    const transactions = await Transaction.find({
      userId,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ amount: -1 });

    // Get allowance topups for the month
    const allowanceTopups = await AllowanceTopup.find({
      userId,
      receivedDate: { $gte: startDate, $lte: endDate }
    });

    // Get current active allowance balance (all time)
    const currentAllowance = await AllowanceTopup.findOne({
      userId,
      active: true
    }).sort({ receivedDate: -1 });

    // Calculate totals
    const totalExpenses = transactions.reduce((sum, t) => sum + t.amount, 0);
    const totalAllowance = allowanceTopups.reduce((sum, a) => sum + a.amount, 0);
    const currentBalance = currentAllowance ? currentAllowance.remaining : 0;
    const remainingAllowance = currentBalance;

    // Category breakdown
    const categoryBreakdown = {
      Allowance: 0,
      Essentials: 0,
      Extra: 0
    };

    transactions.forEach(t => {
      if (categoryBreakdown.hasOwnProperty(t.category)) {
        categoryBreakdown[t.category] += t.amount;
      }
    });

    // Top 5 expenses
    const topExpenses = transactions.slice(0, 5).map(t => ({
      description: t.description,
      amount: t.amount,
      category: t.category,
      date: t.date
    }));

    // Daily average - calculate based on actual days with spending or days passed in current month
    const daysInMonth = new Date(year, month, 0).getDate();
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    let effectiveDays;
    if (year == currentYear && month == currentMonth) {
      // For current month, use days passed so far
      effectiveDays = now.getDate();
    } else {
      // For past months, count days with actual transactions (or full month if no transactions)
      const daysWithTransactions = [...new Set(transactions.map(t =>
        new Date(t.date).getDate()
      ))].length;
      effectiveDays = daysWithTransactions > 0 ? daysWithTransactions : daysInMonth;
    }

    const dailyAverage = effectiveDays > 0 ? totalExpenses / effectiveDays : 0;

    // Weekly pattern
    const weeklyPattern = [
      { day: 'Monday', amount: 0 },
      { day: 'Tuesday', amount: 0 },
      { day: 'Wednesday', amount: 0 },
      { day: 'Thursday', amount: 0 },
      { day: 'Friday', amount: 0 },
      { day: 'Saturday', amount: 0 },
      { day: 'Sunday', amount: 0 }
    ];

    transactions.forEach(t => {
      const dayName = t.date.toLocaleDateString('en-US', { weekday: 'long' });
      const dayIndex = weeklyPattern.findIndex(w => w.day === dayName);
      if (dayIndex !== -1) {
        weeklyPattern[dayIndex].amount += t.amount;
      }
    });

    // Daily spending data for chart
    const dailySpending = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dayStart = new Date(year, month - 1, day);
      const dayEnd = new Date(year, month - 1, day, 23, 59, 59);

      const dayTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= dayStart && transactionDate <= dayEnd;
      });

      const dayTotal = dayTransactions.reduce((sum, t) => sum + t.amount, 0);

      return {
        day: day,
        amount: Math.round(dayTotal * 100) / 100,
        target: Math.round(dailyAverage * 100) / 100,
        transactions: dayTransactions.length
      };
    });

    // Check if report already exists
    let report = await MonthlyReport.findOne({ userId, month, year });

    const reportData = {
      userId,
      month,
      year,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      totalAllowance: Math.round(totalAllowance * 100) / 100,
      remainingAllowance: Math.round(remainingAllowance * 100) / 100,
      categoryBreakdown,
      topExpenses,
      dailyAverage: Math.round(dailyAverage * 100) / 100,
      weeklyPattern,
      dailySpending,
      budgetGoal: totalAllowance,
      goalAchieved: remainingAllowance > 0,
      reportGenerated: true,
      generatedDate: new Date()
    };

    if (report) {
      // Update existing report
      Object.assign(report, reportData);
      await report.save();
    } else {
      // Create new report
      report = new MonthlyReport(reportData);
      await report.save();
    }

    console.log(`Monthly report generated successfully for ${month}/${year}`);
    return report;
  } catch (error) {
    console.error(`Error generating monthly report:`, error);
    throw error;
  }
}

// Get monthly report
router.get('/monthly/:month/:year', auth, async (req, res) => {
  try {
    const { month, year } = req.params;
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (monthNum < 1 || monthNum > 12 || yearNum < 2020 || yearNum > 2030) {
      return res.status(400).json({ message: 'Invalid month or year' });
    }

    let report = await MonthlyReport.findOne({
      userId: req.user._id,
      month: monthNum,
      year: yearNum
    });

    if (!report || !report.reportGenerated) {
      // Generate report if it doesn't exist
      report = await generateMonthlyReport(req.user._id, monthNum, yearNum);
    }

    // Mark as viewed
    if (!report.reportViewed) {
      report.reportViewed = true;
      report.viewedDate = new Date();
      await report.save();
    }

    res.json(report);
  } catch (error) {
    console.error('Get monthly report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Generate report for current month (manual trigger)
router.post('/generate-current', auth, async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const report = await generateMonthlyReport(req.user._id, currentMonth, currentYear);

    res.json({
      message: 'Monthly report generated successfully',
      report
    });
  } catch (error) {
    console.error('Generate current month report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check if report notification should be shown
router.get('/notification-status', auth, async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const currentDay = now.getDate();

    // Check if it's near end of month (last 3 days)
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const isEndOfMonth = currentDay >= (daysInMonth - 2);

    // Check if user has transactions this month
    const monthStart = new Date(currentYear, currentMonth - 1, 1);
    const hasTransactions = await Transaction.findOne({
      userId: req.user._id,
      date: { $gte: monthStart }
    });

    // Check if report exists and if notification was sent
    const report = await MonthlyReport.findOne({
      userId: req.user._id,
      month: currentMonth,
      year: currentYear
    });

    const shouldShowNotification = isEndOfMonth &&
                                  hasTransactions &&
                                  (!report || !report.reportViewed);

    res.json({
      shouldShowNotification,
      isEndOfMonth,
      hasTransactions: !!hasTransactions,
      reportExists: !!report,
      reportViewed: report ? report.reportViewed : false,
      currentMonth,
      currentYear,
      daysInMonth,
      currentDay
    });
  } catch (error) {
    console.error('Notification status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get annual report
router.get('/annual/:year', auth, async (req, res) => {
  try {
    const { year } = req.params;
    const yearNum = parseInt(year);

    if (yearNum < 2020 || yearNum > 2030) {
      return res.status(400).json({ message: 'Invalid year' });
    }

    // Get all monthly reports for the year
    const monthlyReports = await MonthlyReport.find({
      userId: req.user._id,
      year: yearNum
    }).sort({ month: 1 });

    // If no reports exist, generate them
    if (monthlyReports.length === 0) {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      // Generate reports for months that have passed
      const monthsToGenerate = yearNum === currentYear ? currentMonth : 12;

      for (let month = 1; month <= monthsToGenerate; month++) {
        try {
          await generateMonthlyReport(req.user._id, month, yearNum);
        } catch (error) {
          console.log(`Could not generate report for ${month}/${yearNum}: ${error.message}`);
        }
      }

      // Fetch the generated reports
      const newReports = await MonthlyReport.find({
        userId: req.user._id,
        year: yearNum
      }).sort({ month: 1 });

      return res.json(calculateAnnualSummary(newReports, yearNum));
    }

    res.json(calculateAnnualSummary(monthlyReports, yearNum));
  } catch (error) {
    console.error('Get annual report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Calculate annual summary from monthly reports
function calculateAnnualSummary(monthlyReports, year) {
  const totalExpenses = monthlyReports.reduce((sum, r) => sum + r.totalExpenses, 0);
  const totalAllowance = monthlyReports.reduce((sum, r) => sum + r.totalAllowance, 0);
  const totalSavings = monthlyReports.reduce((sum, r) => sum + r.remainingAllowance, 0);

  // Category breakdown for the year
  const annualCategoryBreakdown = {
    Allowance: 0,
    Essentials: 0,
    Extra: 0
  };

  monthlyReports.forEach(report => {
    Object.keys(annualCategoryBreakdown).forEach(category => {
      annualCategoryBreakdown[category] += report.categoryBreakdown[category] || 0;
    });
  });

  // Find month with highest and lowest spending
  const monthlySpending = monthlyReports.map(r => ({
    month: r.month,
    totalExpenses: r.totalExpenses,
    monthName: new Date(year, r.month - 1).toLocaleDateString('en-US', { month: 'long' })
  }));

  const highestSpendingMonth = monthlySpending.reduce((max, current) =>
    current.totalExpenses > max.totalExpenses ? current : max,
    { totalExpenses: 0, month: 1, monthName: 'January' }
  );

  const lowestSpendingMonth = monthlySpending.reduce((min, current) =>
    current.totalExpenses < min.totalExpenses ? current : min,
    { totalExpenses: Infinity, month: 1, monthName: 'January' }
  );

  // Calculate average monthly spending
  const averageMonthlySpending = monthlyReports.length > 0 ? totalExpenses / monthlyReports.length : 0;

  // Spending trends
  const spendingTrends = monthlyReports.map(r => ({
    month: r.month,
    monthName: new Date(year, r.month - 1).toLocaleDateString('en-US', { month: 'short' }),
    totalExpenses: r.totalExpenses,
    savingsRate: r.savingsRate
  }));

  return {
    year,
    summary: {
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      totalAllowance: Math.round(totalAllowance * 100) / 100,
      totalSavings: Math.round(totalSavings * 100) / 100,
      averageMonthlySpending: Math.round(averageMonthlySpending * 100) / 100,
      overallSavingsRate: totalAllowance > 0 ? Math.round((totalSavings / totalAllowance) * 100 * 100) / 100 : 0
    },
    categoryBreakdown: annualCategoryBreakdown,
    monthlyData: spendingTrends,
    insights: {
      highestSpendingMonth,
      lowestSpendingMonth,
      totalMonthsTracked: monthlyReports.length,
      mostSpentCategory: Object.keys(annualCategoryBreakdown).reduce((a, b) =>
        annualCategoryBreakdown[a] > annualCategoryBreakdown[b] ? a : b
      )
    },
    monthlyReports
  };
}

// Mark notification as dismissed
router.post('/dismiss-notification', auth, async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    let report = await MonthlyReport.findOne({
      userId: req.user._id,
      month: currentMonth,
      year: currentYear
    });

    if (!report) {
      report = new MonthlyReport({
        userId: req.user._id,
        month: currentMonth,
        year: currentYear,
        reportGenerated: false,
        notificationSent: true
      });
    } else {
      report.notificationSent = true;
    }

    await report.save();

    res.json({ message: 'Notification dismissed' });
  } catch (error) {
    console.error('Dismiss notification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;