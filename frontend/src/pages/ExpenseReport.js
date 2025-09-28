import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';


const ExpenseReport = () => {
  const { month, year } = useParams();
  const navigate = useNavigate();
  const [reportData, setReportData] = useState(null);
  const [annualData, setAnnualData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewType, setViewType] = useState('monthly');

  const fetchMonthlyReport = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/expense-reports/monthly/${month}/${year}`);
      setReportData(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching monthly report:', error);
      setError('Failed to load monthly report');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  const fetchAnnualReport = useCallback(async () => {
    try {
      const response = await axios.get(`/api/expense-reports/annual/${year}`);
      setAnnualData(response.data);
    } catch (error) {
      console.error('Error fetching annual report:', error);
    }
  }, [year]);

  useEffect(() => {
    if (month && year) {
      fetchMonthlyReport();
      fetchAnnualReport();
    }
  }, [month, year, fetchMonthlyReport, fetchAnnualReport]);

  const getMonthName = (monthNum) => {
    return new Date(year, monthNum - 1).toLocaleDateString('en-US', { month: 'long' });
  };

  const formatCurrency = (amount) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // eslint-disable-next-line no-unused-vars
  const getCategoryColor = (category) => {
    const colors = {
      'Allowance': 'bg-blue-100 text-blue-800',
      'Essentials': 'bg-green-100 text-green-800',
      'Extra': 'bg-purple-100 text-purple-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  // Download report as PDF
  const downloadReport = () => {
    // eslint-disable-next-line no-unused-vars
    const filename = viewType === 'monthly'
      ? `expense-report-${month}-${year}.pdf`
      : `annual-report-${year}.pdf`;

    // Hide download button and navigation for clean PDF
    const downloadBtn = document.querySelector('[data-download-btn]');
    const navElements = document.querySelectorAll('[data-hide-in-pdf]');

    if (downloadBtn) downloadBtn.style.display = 'none';
    navElements.forEach(el => el.style.display = 'none');

    // Set print styles
    const printStyles = `
      <style>
        @media print {
          body { -webkit-print-color-adjust: exact; }
          .no-print { display: none !important; }
          .page-break { page-break-before: always; }
          .bg-gradient-to-r { background: #1e40af !important; }
          .bg-blue-600 { background: #1e40af !important; }
          .bg-blue-800 { background: #1e3a8a !important; }
        }
      </style>
    `;

    const head = document.head;
    const styleElement = document.createElement('style');
    styleElement.innerHTML = printStyles;
    head.appendChild(styleElement);

    // Trigger print dialog
    window.print();

    // Restore elements after print
    setTimeout(() => {
      if (downloadBtn) downloadBtn.style.display = 'flex';
      navElements.forEach(el => el.style.display = '');
      head.removeChild(styleElement);
    }, 1000);
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Generating your expense report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Report Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Power BI Style Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="text-white">
              <h1 className="text-3xl font-bold mb-1">💼 Financial Analytics Dashboard</h1>
              <p className="text-blue-100 text-lg">
                {viewType === 'monthly'
                  ? `${getMonthName(month)} ${year} Performance Report`
                  : `${year} Annual Business Intelligence Report`}
              </p>
              <p className="text-blue-200 text-sm mt-1">
                📊 Generated: {new Date().toLocaleDateString('en-US', {
                  year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
            <div className="flex space-x-3">
              {/* Download Button */}
              <button
                onClick={downloadReport}
                data-download-btn
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors flex items-center space-x-2 no-print"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span>Download</span>
              </button>

              {/* View Toggle */}
              <div className="bg-white bg-opacity-20 rounded-lg p-1 no-print" data-hide-in-pdf>
                <button
                  onClick={() => setViewType('monthly')}
                  className={`px-4 py-2 rounded-md font-medium transition-all ${
                    viewType === 'monthly'
                      ? 'bg-white text-blue-800 shadow-md'
                      : 'text-white hover:bg-white hover:bg-opacity-10'
                  }`}
                >
                  📊 Monthly
                </button>
                <button
                  onClick={() => setViewType('annual')}
                  className={`px-4 py-2 rounded-md font-medium transition-all ${
                    viewType === 'annual'
                      ? 'bg-white text-blue-800 shadow-md'
                      : 'text-white hover:bg-white hover:bg-opacity-10'
                  }`}
                >
                  📈 Annual
                </button>
              </div>

              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 bg-white bg-opacity-20 hover:bg-white hover:bg-opacity-30 text-white rounded-lg font-medium transition-colors no-print"
                data-hide-in-pdf
              >
                ← Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {viewType === 'monthly' && reportData && (
          <div className="space-y-6">
            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Spent</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(reportData.totalExpenses)}</p>
                    <p className="text-xs text-gray-500 mt-1">This month</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Budget</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(reportData.totalAllowance)}</p>
                    <p className="text-xs text-gray-500 mt-1">Monthly allowance</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Remaining</p>
                    <p className={`text-2xl font-bold ${reportData.remainingAllowance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(reportData.remainingAllowance)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Available balance</p>
                  </div>
                  <div className={`p-3 rounded-full ${reportData.remainingAllowance >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                    <svg className={`w-6 h-6 ${reportData.remainingAllowance >= 0 ? 'text-green-600' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Daily Average</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(reportData.dailyAverage || 0)}</p>
                    <p className="text-xs text-gray-500 mt-1">Per day spending</p>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-full">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>


            {/* Top Transactions Table */}
            {reportData.topExpenses && reportData.topExpenses.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🏆 Top Transactions</h3>
                <div className="overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.topExpenses.map((expense, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className="bg-blue-100 text-blue-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded">
                                #{index + 1}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {expense.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              expense.category === 'Allowance' ? 'bg-blue-100 text-blue-800' :
                              expense.category === 'Essentials' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                              {expense.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(expense.date).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric'
                            })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                            {formatCurrency(expense.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {viewType === 'annual' && annualData && (
          <div className="space-y-6">
            {/* Annual KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-red-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Annual Spent</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(annualData.summary.totalExpenses)}</p>
                    <p className="text-xs text-gray-500 mt-1">Year {year}</p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-full">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Budget</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(annualData.summary.totalAllowance)}</p>
                    <p className="text-xs text-gray-500 mt-1">Annual allowance</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Savings</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(annualData.summary.totalSavings)}</p>
                    <p className="text-xs text-gray-500 mt-1">Accumulated</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Monthly Average</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(annualData.summary.averageMonthlySpending)}</p>
                    <p className="text-xs text-gray-500 mt-1">Per month</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-full">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>


            {/* Performance Insights Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-red-500 rounded-full mr-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-red-800">Peak Spending</h4>
                    <p className="text-sm text-red-600">Highest monthly expense</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-red-800 mb-2">
                  {annualData.insights?.highestSpendingMonth?.monthName || 'N/A'}
                </p>
                <p className="text-lg font-semibold text-red-700">
                  {formatCurrency(annualData.insights?.highestSpendingMonth?.totalExpenses || 0)}
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-green-500 rounded-full mr-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-green-800">Best Performance</h4>
                    <p className="text-sm text-green-600">Lowest monthly expense</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-green-800 mb-2">
                  {annualData.insights?.lowestSpendingMonth?.monthName || 'N/A'}
                </p>
                <p className="text-lg font-semibold text-green-700">
                  {formatCurrency(annualData.insights?.lowestSpendingMonth?.totalExpenses || 0)}
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-blue-500 rounded-full mr-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-blue-800">Top Category</h4>
                    <p className="text-sm text-blue-600">Most spent category</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-blue-800 mb-2">
                  {annualData.insights?.mostSpentCategory || 'N/A'}
                </p>
                <p className="text-lg font-semibold text-blue-700">
                  {formatCurrency(annualData.categoryBreakdown?.[annualData.insights?.mostSpentCategory] || 0)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseReport;