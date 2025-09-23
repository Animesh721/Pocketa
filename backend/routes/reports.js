const express = require('express');
const auth = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Essential = require('../models/Essential');
const AllowanceTopup = require('../models/AllowanceTopup');

const router = express.Router();

// Generate PDF Expense Report
router.get('/expense-pdf', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // Get date range for the report (last 30 days by default)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    // Get all transactions
    const transactions = await Transaction.find({
      userId: req.user._id,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: -1 });

    // Get essentials
    const essentials = await Essential.find({
      userId: req.user._id,
      isActive: true
    });

    // Get allowance topups
    const allowanceTopups = await AllowanceTopup.find({
      userId: req.user._id,
      createdAt: { $gte: startDate, $lte: endDate }
    }).sort({ createdAt: -1 });

    // Calculate summary statistics with debugging
    console.log('=== EXPENSE REPORT DEBUGGING ===');
    console.log('Date range:', startDate, 'to', endDate);
    console.log('Total transactions found:', transactions.length);
    console.log('Total allowance topups found:', allowanceTopups.length);

    // Debug allowance topups
    console.log('Allowance topups details:', allowanceTopups.map(topup => ({
      id: topup._id,
      amount: topup.amount,
      originalAmount: topup.originalAmount,
      createdAt: topup.createdAt,
      inDateRange: new Date(topup.createdAt) >= startDate
    })));

    // Calculate all-time total allowance for comparison
    const allTimeAllowanceReceived = allowanceTopups.reduce((sum, topup) => {
      const amount = topup.originalAmount || topup.amount;
      return sum + amount;
    }, 0);

    // Filter allowance topups by date range
    const topupsInRange = allowanceTopups.filter(topup => new Date(topup.createdAt) >= startDate);
    console.log('Topups in date range:', topupsInRange.length);

    // Use all-time allowance received for total deposits comparison
    const totalAllowanceReceived = allTimeAllowanceReceived;

    console.log('Using all-time allowance for report:', totalAllowanceReceived);

    console.log('Total allowance received calculated:', totalAllowanceReceived);

    // Debug transactions
    console.log('All transaction types:', [...new Set(transactions.map(t => t.type))]);
    console.log('All transaction categories:', [...new Set(transactions.map(t => t.category))]);

    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    console.log('Expense transactions found:', expenseTransactions.length);
    console.log('Sample expense transactions:', expenseTransactions.slice(0, 10).map(t => ({
      amount: t.amount,
      category: t.category,
      description: t.description,
      date: t.date,
      type: t.type
    })));

    // Check for duplicate or incorrect transactions
    const duplicateCheck = expenseTransactions.reduce((acc, t) => {
      const key = `${t.amount}-${t.description}-${t.date}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const duplicates = Object.entries(duplicateCheck).filter(([key, count]) => count > 1);
    if (duplicates.length > 0) {
      console.log('Potential duplicate transactions:', duplicates);
    }

    const categoryTotals = expenseTransactions.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

    const totalExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);

    console.log('Category totals:', categoryTotals);
    console.log('Total expenses calculated:', totalExpenses);
    console.log('=== END DEBUGGING ===');

    // Generate HTML content for the PDF
    const htmlContent = generateExpenseReportHTML({
      user,
      transactions,
      essentials,
      allowanceTopups,
      categoryTotals,
      totalExpenses,
      totalAllowanceReceived,
      startDate,
      endDate
    });

    // For now, return the HTML content as a simple PDF alternative
    // In a production environment, you would use a library like puppeteer or pdfkit
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="expense-report-${endDate.toISOString().split('T')[0]}.html"`);
    res.send(htmlContent);

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ message: 'Failed to generate expense report' });
  }
});

function generateMoneySavingSuggestions(categoryTotals, transactions, totalExpenses, allowanceTopups) {
  const suggestions = [];

  // Calculate spending per category as percentage
  const categoryPercentages = {};
  Object.entries(categoryTotals).forEach(([category, amount]) => {
    categoryPercentages[category] = (amount / totalExpenses) * 100;
  });

  // 1. High spending category suggestions
  const highestCategory = Object.entries(categoryPercentages).sort((a, b) => b[1] - a[1])[0];
  if (highestCategory && highestCategory[1] > 40) {
    suggestions.push({
      type: 'category-focus',
      icon: '🎯',
      title: `Focus on ${highestCategory[0]} Spending`,
      description: `${highestCategory[0]} accounts for ${highestCategory[1].toFixed(1)}% of your expenses. Consider setting a monthly limit for this category.`,
      tip: `Try the 50/30/20 rule: essentials, wants, savings.`
    });
  }

  // 2. Frequent small transactions
  const smallTransactions = transactions.filter(t => t.amount <= 50 && t.type === 'expense');
  if (smallTransactions.length > 10) {
    suggestions.push({
      type: 'small-expenses',
      icon: '☕',
      title: 'Watch Small Expenses',
      description: `You have ${smallTransactions.length} transactions under ₹50. These small purchases add up to ₹${smallTransactions.reduce((sum, t) => sum + t.amount, 0).toLocaleString()}.`,
      tip: 'Consider the "24-hour rule" - wait a day before making non-essential purchases.'
    });
  }

  // 3. Extra spending suggestions
  if (categoryTotals['Extra'] && categoryTotals['Extra'] > 0) {
    const extraPercentage = (categoryTotals['Extra'] / totalExpenses) * 100;
    if (extraPercentage > 30) {
      suggestions.push({
        type: 'extra-spending',
        icon: '💸',
        title: 'Reduce Extra Spending',
        description: `Extra/discretionary spending is ${extraPercentage.toFixed(1)}% of your total expenses (₹${categoryTotals['Extra'].toLocaleString()}).`,
        tip: 'Try the envelope method: allocate a fixed amount for extras and stick to it.'
      });
    }
  }

  // 4. Budget planning suggestion
  if (totalExpenses > 0) {
    const avgDailySpending = totalExpenses / 30;
    suggestions.push({
      type: 'budget-planning',
      icon: '📊',
      title: 'Daily Spending Average',
      description: `Your average daily spending is ₹${avgDailySpending.toFixed(0)}. Plan your weekly budget accordingly.`,
      tip: 'Track expenses daily to stay within your budget and avoid overspending.'
    });
  }

  // 5. Savings goal suggestion
  const currentTopup = allowanceTopups[0];
  if (currentTopup && currentTopup.remaining > 0) {
    const savingsPercentage = (currentTopup.remaining / currentTopup.amount) * 100;
    suggestions.push({
      type: 'savings-goal',
      icon: '🎯',
      title: 'Savings Progress',
      description: `You have ₹${currentTopup.remaining.toLocaleString()} remaining (${savingsPercentage.toFixed(1)}% of your allowance).`,
      tip: savingsPercentage > 20 ? 'Great job saving! Consider setting aside 20% for future goals.' : 'Try to save at least 20% of your allowance for emergencies.'
    });
  }

  // 6. Category-specific tips
  if (categoryTotals['Essentials']) {
    suggestions.push({
      type: 'essentials-tip',
      icon: '🏠',
      title: 'Essential Expenses',
      description: `Essentials cost ₹${categoryTotals['Essentials'].toLocaleString()}. These are necessary but can often be optimized.`,
      tip: 'Look for discounts, compare prices, and consider bulk buying for frequently used items.'
    });
  }

  return suggestions.slice(0, 6); // Return max 6 suggestions
}

function generateExpenseReportHTML(data) {
  const { user, transactions, essentials, allowanceTopups, categoryTotals, totalExpenses, totalAllowanceReceived, startDate, endDate } = data;

  // Generate money-saving suggestions based on spending patterns
  const suggestions = generateMoneySavingSuggestions(categoryTotals, transactions, totalExpenses, allowanceTopups);

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Expense Report - ${user.name}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 10px;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-bottom: 30px;
        }
        .summary-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
        }
        .summary-card h3 {
            margin: 0 0 10px 0;
            color: #667eea;
            font-size: 14px;
            text-transform: uppercase;
        }
        .summary-card .amount {
            font-size: 24px;
            font-weight: bold;
            color: #333;
        }
        .section {
            background: white;
            margin-bottom: 20px;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .section-header {
            background: #667eea;
            color: white;
            padding: 15px 20px;
            font-weight: bold;
            font-size: 16px;
        }
        .section-content {
            padding: 20px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }
        th {
            background-color: #f8f9fa;
            font-weight: 600;
            color: #333;
        }
        .category-allowance { color: #28a745; }
        .category-essentials { color: #fd7e14; }
        .category-extra { color: #dc3545; }
        .expense-amount {
            font-weight: bold;
            text-align: right;
        }
        .footer {
            margin-top: 30px;
            text-align: center;
            color: #666;
            font-size: 12px;
            padding: 20px;
            background: white;
            border-radius: 8px;
        }
        .suggestions-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        .suggestion-card {
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .suggestion-header {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
        }
        .suggestion-icon {
            font-size: 20px;
            margin-right: 10px;
        }
        .suggestion-title {
            font-size: 16px;
            font-weight: bold;
            color: #333;
            margin: 0;
        }
        .suggestion-description {
            color: #555;
            margin: 10px 0;
            line-height: 1.4;
        }
        .suggestion-tip {
            background: #e8f4fd;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 14px;
            color: #0066cc;
            border-left: 3px solid #0099ff;
        }
        @media print {
            body { background-color: white; }
            .summary { grid-template-columns: repeat(3, 1fr); }
            .suggestions-grid { grid-template-columns: repeat(2, 1fr); }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Expense Report</h1>
        <h2>${user.name}</h2>
        <p>Period: ${startDate.toLocaleDateString('en-IN')} - ${endDate.toLocaleDateString('en-IN')}</p>
        <p>Generated on: ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}</p>
    </div>

    <div class="summary">
        <div class="summary-card">
            <h3>Total Allowance Received (All Time)</h3>
            <div class="amount">₹${totalAllowanceReceived.toLocaleString()}</div>
        </div>
        <div class="summary-card">
            <h3>Total Expenses</h3>
            <div class="amount">₹${totalExpenses.toLocaleString()}</div>
        </div>
        <div class="summary-card">
            <h3>Total Transactions</h3>
            <div class="amount">${transactions.length}</div>
        </div>
    </div>

    <div class="section">
        <div class="section-header">📈 Expense Breakdown by Category</div>
        <div class="section-content">
            <table>
                <thead>
                    <tr>
                        <th>Category</th>
                        <th>Amount</th>
                        <th>Percentage</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(categoryTotals).map(([category, amount]) => `
                        <tr>
                            <td class="category-${category.toLowerCase()}">${category}</td>
                            <td class="expense-amount">₹${amount.toLocaleString()}</td>
                            <td>${((amount / totalExpenses) * 100).toFixed(1)}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>

    <div class="section">
        <div class="section-header">💡 Money-Saving Suggestions</div>
        <div class="section-content">
            <div class="suggestions-grid">
                ${suggestions.map(suggestion => `
                    <div class="suggestion-card">
                        <div class="suggestion-header">
                            <span class="suggestion-icon">${suggestion.icon}</span>
                            <h4 class="suggestion-title">${suggestion.title}</h4>
                        </div>
                        <p class="suggestion-description">${suggestion.description}</p>
                        <div class="suggestion-tip">
                            <strong>💡 Tip:</strong> ${suggestion.tip}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    </div>

    ${allowanceTopups.length > 0 ? `
    <div class="section">
        <div class="section-header">💰 Allowance Topups</div>
        <div class="section-content">
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Spent</th>
                        <th>Remaining</th>
                        <th>Days Lasted</th>
                    </tr>
                </thead>
                <tbody>
                    ${allowanceTopups.map(topup => `
                        <tr>
                            <td>${new Date(topup.createdAt).toLocaleDateString('en-IN')}</td>
                            <td class="expense-amount">₹${topup.amount.toLocaleString()}</td>
                            <td class="expense-amount">₹${topup.spent.toLocaleString()}</td>
                            <td class="expense-amount">₹${topup.remaining.toLocaleString()}</td>
                            <td>${topup.daysLasted || 'Active'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>
    ` : ''}

    ${essentials.length > 0 ? `
    <div class="section">
        <div class="section-header">🏠 Fixed Essentials</div>
        <div class="section-content">
            <table>
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Monthly Amount</th>
                        <th>Due Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${essentials.map(essential => `
                        <tr>
                            <td>${essential.name}</td>
                            <td class="expense-amount">₹${essential.amount.toLocaleString()}</td>
                            <td>${essential.dueDate}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>
    ` : ''}

    <div class="section">
        <div class="section-header">📝 Recent Transactions</div>
        <div class="section-content">
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Category</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${transactions.slice(0, 50).map(transaction => `
                        <tr>
                            <td>${new Date(transaction.date).toLocaleDateString('en-IN')}</td>
                            <td>${transaction.description}</td>
                            <td class="category-${transaction.category.toLowerCase()}">${transaction.category}</td>
                            <td class="expense-amount">₹${transaction.amount.toLocaleString()}</td>
                        </tr>
                    `).join('')}
                    ${transactions.length > 50 ? `
                        <tr>
                            <td colspan="4" style="text-align: center; font-style: italic; color: #666;">
                                ... and ${transactions.length - 50} more transactions
                            </td>
                        </tr>
                    ` : ''}
                </tbody>
            </table>
        </div>
    </div>

    <div class="footer">
        <p><strong>Smart Allowance Tracker</strong></p>
        <p>This report was automatically generated and contains your personal financial data.</p>
        <p>Report ID: SAT-${user._id.toString().slice(-8)}-${Date.now()}</p>
    </div>

    <script>
        // Auto-print for PDF generation (can be removed if not needed)
        // window.onload = function() { window.print(); }
    </script>
</body>
</html>
  `;
}

module.exports = router;