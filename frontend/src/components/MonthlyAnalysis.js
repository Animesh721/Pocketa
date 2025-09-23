import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import axios from 'axios';

const MonthlyAnalysis = () => {
  const [data, setData] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('chart'); // 'chart' or 'table'

  const fetchMonthlyData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/advice/monthly-analysis?year=${selectedYear}`);
      setData(response.data);
      setError('');
    } catch (error) {
      console.error('Monthly analysis fetch error:', error);
      setError('Failed to load monthly analysis');
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchMonthlyData();
  }, [fetchMonthlyData]);

  const formatCurrency = (amount) => `₹${Math.round(amount)}`;

  const chartData = data?.monthlyData?.map(month => ({
    month: month.monthName.slice(0, 3),
    received: month.totalReceived,
    spent: month.totalSpent,
    saved: month.totalSaved
  })) || [];

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-40 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <p className="text-red-600 text-center">{error}</p>
        <button onClick={fetchMonthlyData} className="btn-primary w-full mt-4">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Monthly Allowance Analysis</h2>
            <p className="text-gray-600 text-sm">Track your allowance spending and savings patterns</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="input-field text-sm"
            >
              {[2024, 2023, 2022].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>

            <div className="flex rounded-md overflow-hidden border border-gray-300">
              <button
                onClick={() => setViewMode('chart')}
                className={`px-3 py-2 text-sm ${viewMode === 'chart' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                📊 Chart
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 text-sm ${viewMode === 'table' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                📋 Table
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Year Summary */}
      {data?.yearSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card text-center">
            <p className="text-sm text-gray-600">Total Received</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(data.yearSummary.totalReceived)}</p>
          </div>
          <div className="card text-center">
            <p className="text-sm text-gray-600">Total Spent</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(data.yearSummary.totalSpent)}</p>
          </div>
          <div className="card text-center">
            <p className="text-sm text-gray-600">Total Saved</p>
            <p className={`text-2xl font-bold ${data.yearSummary.totalSaved >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(data.yearSummary.totalSaved)}
            </p>
          </div>
          <div className="card text-center">
            <p className="text-sm text-gray-600">Savings Rate</p>
            <p className={`text-2xl font-bold ${data.yearSummary.totalSaved >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {data.yearSummary.totalReceived > 0 ?
                Math.round((data.yearSummary.totalSaved / data.yearSummary.totalReceived) * 100) : 0}%
            </p>
          </div>
        </div>
      )}

      {/* Chart/Table View */}
      <div className="card">
        {viewMode === 'chart' ? (
          <div className="space-y-6">
            {/* Spending vs Savings Chart */}
            <div>
              <h3 className="text-lg font-medium mb-4">Monthly Spending vs Savings</h3>
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="received" fill="#10b981" name="Received" />
                    <Bar dataKey="spent" fill="#ef4444" name="Spent" />
                    <Bar dataKey="saved" fill="#3b82f6" name="Saved" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Trend Line */}
            <div>
              <h3 className="text-lg font-medium mb-4">Savings Trend</h3>
              <div className="h-48 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Line type="monotone" dataKey="saved" stroke="#3b82f6" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          /* Table View */
          <div className="overflow-x-auto">
            <table className="mobile-table min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Received</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spent</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Saved</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Topups</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Daily Avg</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data?.monthlyData?.map((month, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td data-label="Month" className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {month.monthName}
                    </td>
                    <td data-label="Received" className="px-3 py-4 whitespace-nowrap text-sm text-green-600">
                      {formatCurrency(month.totalReceived)}
                    </td>
                    <td data-label="Spent" className="px-3 py-4 whitespace-nowrap text-sm text-red-600">
                      {formatCurrency(month.totalSpent)}
                    </td>
                    <td data-label="Saved" className={`px-3 py-4 whitespace-nowrap text-sm font-medium ${month.totalSaved >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(month.totalSaved)}
                    </td>
                    <td data-label="Topups" className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                      {month.topupsCount}
                    </td>
                    <td data-label="Daily Avg" className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(month.dailyAvgSpent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Insights */}
      {data?.yearSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card bg-green-50 border-green-200">
            <h4 className="font-medium text-green-900 mb-2">🏆 Best Saving Month</h4>
            <p className="text-green-800">
              {data.yearSummary.bestSavingMonth?.monthName} - Saved {formatCurrency(data.yearSummary.bestSavingMonth?.totalSaved)}
            </p>
          </div>

          <div className="card bg-red-50 border-red-200">
            <h4 className="font-medium text-red-900 mb-2">⚠️ Highest Spending Month</h4>
            <p className="text-red-800">
              {data.yearSummary.highestSpendingMonth?.monthName} - Spent {formatCurrency(data.yearSummary.highestSpendingMonth?.totalSpent)}
            </p>
          </div>
        </div>
      )}

      {/* Monthly Goals */}
      <div className="card bg-blue-50 border-blue-200">
        <h4 className="font-medium text-blue-900 mb-3">💡 Monthly Goals</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-blue-800">
              <strong>Target Savings:</strong> {formatCurrency(data?.yearSummary?.avgMonthlySpending * 0.2 || 0)}/month
            </p>
          </div>
          <div>
            <p className="text-blue-800">
              <strong>Current Avg:</strong> {formatCurrency(data?.yearSummary?.avgMonthlySavings || 0)}/month
            </p>
          </div>
          <div>
            <p className="text-blue-800">
              <strong>Daily Budget:</strong> {formatCurrency((data?.yearSummary?.avgMonthlySpending * 0.8) / 30 || 0)}/day
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyAnalysis;