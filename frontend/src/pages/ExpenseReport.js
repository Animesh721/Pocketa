import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import axios from 'axios';

const generateMoneySavingSuggestions = (categoryTotals, transactions, totalExpenses, allowanceTopups) => {
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
};

const ExpenseReport = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true);

      // Get date range for the report (last 30 days by default)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const [transactionsResponse, essentialsResponse, allowanceResponse] = await Promise.all([
        axios.get(`/api/transactions?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&limit=100`),
        axios.get('/api/user/settings'),
        axios.get('/api/allowance')
      ]);

      const transactions = transactionsResponse.data.transactions || [];
      const essentials = essentialsResponse.data.essentials || [];
      const allowanceTopups = allowanceResponse.data || [];

      // Calculate summary statistics
      const categoryTotals = transactions.reduce((acc, t) => {
        if (t.type === 'expense') {
          acc[t.category] = (acc[t.category] || 0) + t.amount;
        }
        return acc;
      }, {});

      const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      // Debug logging for transactions
      console.log('Debug - All transactions:', transactions.length);
      console.log('Debug - Expense transactions:', transactions.filter(t => t.type === 'expense').length);
      console.log('Debug - Total expenses calculated:', totalExpenses);

      // Calculate all-time total allowance for comparison
      const allTimeAllowanceReceived = allowanceTopups.reduce((sum, topup) => {
        const amount = topup.originalAmount || topup.amount;
        return sum + amount;
      }, 0);

      // Filter topups by date range first
      const topupsInRange = allowanceTopups.filter(topup => new Date(topup.createdAt) >= startDate);

      // Use all-time allowance received for total deposits comparison
      const totalAllowanceReceived = allTimeAllowanceReceived;

      // Debug logging to see what we're working with
      console.log('=== FRONTEND EXPENSE REPORT DEBUGGING ===');
      console.log('Date range:', startDate, 'to', endDate);
      console.log('Total allowance topups found:', allowanceTopups.length);
      console.log('Topups in date range:', topupsInRange.length);
      console.log('Debug - Allowance topups in date range:', topupsInRange.map(topup => ({
        amount: topup.amount,
        originalAmount: topup.originalAmount,
        spent: topup.spent,
        remaining: topup.remaining,
        createdAt: topup.createdAt
      })));
      console.log('Debug - Total allowance received calculated:', totalAllowanceReceived);
      console.log('Debug - All transactions:', transactions.length);
      console.log('Debug - Expense transactions:', transactions.filter(t => t.type === 'expense').length);
      console.log('=== END FRONTEND DEBUGGING ===');

      // Generate money-saving suggestions
      const suggestions = generateMoneySavingSuggestions(categoryTotals, transactions, totalExpenses, allowanceTopups);

      setReportData({
        user,
        transactions,
        essentials,
        allowanceTopups: allowanceTopups.filter(topup => new Date(topup.createdAt) >= startDate),
        categoryTotals,
        totalExpenses,
        totalAllowanceReceived,
        startDate,
        endDate,
        suggestions
      });

      setError('');
    } catch (error) {
      console.error('Report fetch error:', error);
      console.error('Error details:', error.response?.data);
      setError(`Failed to load report data: ${error.response?.data?.message || error.message}. Please try again.`);
    } finally {
      setLoading(false);
    }
  }, []);

  const downloadPDF = async () => {
    try {
      setDownloading(true);
      const response = await axios.get('/api/reports/expense-pdf', {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `expense-report-${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download expense report. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-600/50 p-8 max-w-md w-full">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Something went wrong</h3>
            <p className="text-slate-300 mb-6">{error}</p>
            <div className="flex space-x-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex-1 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={fetchReportData}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 backdrop-blur-sm border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-4 sm:mb-0">
              <h1 className="text-3xl font-bold text-white flex items-center">
                <svg className="w-8 h-8 mr-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Expense Report
              </h1>
              <p className="text-lg text-slate-300 mt-1">
                {reportData?.startDate.toLocaleDateString('en-IN')} - {reportData?.endDate.toLocaleDateString('en-IN')}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="bg-slate-800/50 hover:bg-slate-700/50 text-slate-200 font-medium px-6 py-3 rounded-lg border border-slate-600/50 transition-all duration-200"
              >
                Back to Dashboard
              </button>
              <button
                onClick={downloadPDF}
                disabled={downloading}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium px-6 py-3 rounded-lg transition-all duration-200 shadow-xl hover:shadow-blue-500/40 disabled:opacity-50"
              >
                {downloading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Downloading...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download PDF
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Report Preview */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-600/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-green-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
            <h3 className="text-sm font-medium text-slate-300 mb-2">Total Allowance Received (All Time)</h3>
            <p className="text-2xl font-bold text-white">₹{reportData?.totalAllowanceReceived.toLocaleString()}</p>
          </div>

          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-600/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-red-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
            </div>
            <h3 className="text-sm font-medium text-slate-300 mb-2">Total Expenses</h3>
            <p className="text-2xl font-bold text-white">₹{reportData?.totalExpenses.toLocaleString()}</p>
          </div>


          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-600/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-purple-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
            </div>
            <h3 className="text-sm font-medium text-slate-300 mb-2">Total Transactions</h3>
            <p className="text-2xl font-bold text-white">{reportData?.transactions.length}</p>
          </div>
        </div>

        {/* Category Breakdown */}
        {Object.keys(reportData?.categoryTotals || {}).length > 0 && (
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-600/50 p-6 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Expense Breakdown by Category
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-600/50">
                    <th className="text-left py-3 px-4 font-medium text-slate-300">Category</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-300">Amount</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-300">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(reportData?.categoryTotals || {}).map(([category, amount]) => (
                    <tr key={category} className="border-b border-slate-700/30">
                      <td className="py-3 px-4 text-white font-medium">{category}</td>
                      <td className="py-3 px-4 text-right text-white">₹{amount.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-slate-300">
                        {((amount / reportData?.totalExpenses) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Money-Saving Suggestions */}
        {reportData?.suggestions?.length > 0 && (
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-600/50 p-6 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              💡 Money-Saving Suggestions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reportData.suggestions.map((suggestion, index) => (
                <div key={index} className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-4 hover:bg-slate-700/50 transition-colors">
                  <div className="flex items-center mb-3">
                    <span className="text-2xl mr-3">{suggestion.icon}</span>
                    <h4 className="font-semibold text-white text-sm">{suggestion.title}</h4>
                  </div>
                  <p className="text-slate-300 text-sm mb-3 leading-relaxed">{suggestion.description}</p>
                  <div className="bg-blue-900/20 border border-blue-500/20 rounded-md p-3">
                    <p className="text-blue-300 text-xs">
                      <span className="font-medium">💡 Tip:</span> {suggestion.tip}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Transactions */}
        {reportData?.transactions.length > 0 && (
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-600/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Recent Transactions ({Math.min(reportData?.transactions.length, 20)} of {reportData?.transactions.length})
            </h3>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-600/50">
                    <th className="text-left py-3 px-4 font-medium text-slate-300">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-300">Description</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-300">Category</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-300">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData?.transactions.slice(0, 20).map((transaction, index) => (
                    <tr key={index} className="border-b border-slate-700/30">
                      <td className="py-3 px-4 text-slate-300">
                        {new Date(transaction.date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-white">{transaction.description}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.category === 'Allowance' ? 'bg-green-900/30 text-green-300' :
                          transaction.category === 'Essentials' ? 'bg-orange-900/30 text-orange-300' :
                          'bg-red-900/30 text-red-300'
                        }`}>
                          {transaction.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-white font-medium">
                        ₹{transaction.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {reportData?.transactions.length > 20 && (
                    <tr>
                      <td colSpan="4" className="py-3 px-4 text-center text-slate-400 italic">
                        ... and {reportData?.transactions.length - 20} more transactions
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-3">
              {reportData?.transactions.slice(0, 20).map((transaction, index) => (
                <div key={index} className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="text-white font-medium text-sm mb-1">{transaction.description}</p>
                      <p className="text-slate-400 text-xs">
                        {new Date(transaction.date).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    <div className="text-right ml-3">
                      <p className="text-white font-bold text-lg">₹{transaction.amount.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      transaction.category === 'Allowance' ? 'bg-green-900/30 text-green-300' :
                      transaction.category === 'Essentials' ? 'bg-orange-900/30 text-orange-300' :
                      'bg-red-900/30 text-red-300'
                    }`}>
                      {transaction.category}
                    </span>
                  </div>
                </div>
              ))}
              {reportData?.transactions.length > 20 && (
                <div className="text-center py-4">
                  <p className="text-slate-400 italic text-sm">
                    ... and {reportData?.transactions.length - 20} more transactions
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseReport;