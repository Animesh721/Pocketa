import React from 'react';

const AllowanceProgress = ({ allowance }) => {
  const { budget, spent, remaining } = allowance;
  const percentageSpent = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;

  const getProgressColor = () => {
    if (percentageSpent >= 90) return 'from-red-500 to-red-600';
    if (percentageSpent >= 70) return 'from-amber-500 to-orange-500';
    return 'from-emerald-500 to-green-600';
  };

  const getRemainingColor = () => {
    if (remaining <= 0) return 'text-red-600';
    if (remaining < budget * 0.3) return 'text-amber-600';
    return 'text-emerald-600';
  };

  const getBudgetStatus = () => {
    if (percentageSpent >= 90) return { icon: '⚠️', status: 'Critical', color: 'text-red-600' };
    if (percentageSpent >= 70) return { icon: '⚡', status: 'Caution', color: 'text-amber-600' };
    return { icon: '✅', status: 'Healthy', color: 'text-emerald-600' };
  };

  const budgetStatus = getBudgetStatus();

  return (
    <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="text-lg font-semibold text-white">Budget Overview</h3>
          </div>
          <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/10 ${budgetStatus.color}`}>
            <span className="text-sm">{budgetStatus.icon}</span>
            <span className="text-sm font-medium text-white">{budgetStatus.status}</span>
          </div>
        </div>
        <p className="text-slate-300 text-sm mt-1">Real-time budget performance metrics</p>
      </div>

      <div className="p-6">

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Total Budget</p>
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-blue-900">₹{budget.toLocaleString()}</p>
            <p className="text-xs text-blue-700 mt-1">Allocated funds</p>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Utilized</p>
              <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-amber-900">₹{spent.toLocaleString()}</p>
            <p className="text-xs text-amber-700 mt-1">{percentageSpent.toFixed(1)}% of budget</p>
          </div>

          <div className={`bg-gradient-to-br rounded-lg p-4 border ${
            remaining > 0
              ? 'from-emerald-50 to-green-50 border-emerald-200'
              : 'from-red-50 to-rose-50 border-red-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <p className={`text-xs font-semibold uppercase tracking-wide ${
                remaining > 0 ? 'text-emerald-600' : 'text-red-600'
              }`}>Available</p>
              <svg className={`w-4 h-4 ${
                remaining > 0 ? 'text-emerald-500' : 'text-red-500'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={remaining > 0
                  ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  : "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                } />
              </svg>
            </div>
            <p className={`text-2xl font-bold ${
              remaining > 0 ? 'text-emerald-900' : 'text-red-900'
            }`}>₹{Math.abs(remaining).toLocaleString()}</p>
            <p className={`text-xs mt-1 ${
              remaining > 0 ? 'text-emerald-700' : 'text-red-700'
            }`}>{remaining > 0 ? 'Ready to spend' : 'Over budget'}</p>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-sm font-semibold text-slate-700">Budget Utilization Analysis</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-lg font-bold text-slate-900">{percentageSpent.toFixed(1)}%</span>
              <span className="text-sm text-slate-500">utilized</span>
            </div>
          </div>

          <div className="relative">
            <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden shadow-inner">
              <div
                className={`h-4 bg-gradient-to-r ${getProgressColor()} rounded-full transition-all duration-1000 ease-out relative`}
                style={{ width: `${Math.min(percentageSpent, 100)}%` }}
              >
                <div className="absolute inset-0 bg-white opacity-25 animate-pulse"></div>
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                  <div className="w-2 h-2 bg-white rounded-full opacity-75"></div>
                </div>
              </div>
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-2">
              <span className="flex items-center">
                <div className="w-2 h-2 bg-slate-300 rounded-full mr-1"></div>
                ₹0
              </span>
              <span className="flex items-center">
                ₹{budget.toLocaleString()}
                <div className="w-2 h-2 bg-slate-600 rounded-full ml-1"></div>
              </span>
            </div>
          </div>

          {/* Spending Velocity Indicator */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-sm font-medium text-slate-700">Spending Velocity</span>
              </div>
              <span className={`text-sm font-semibold ${
                percentageSpent > 80 ? 'text-red-600' :
                percentageSpent > 50 ? 'text-amber-600' : 'text-green-600'
              }`}>
                {percentageSpent > 80 ? 'High' :
                 percentageSpent > 50 ? 'Moderate' : 'Conservative'}
              </span>
            </div>
          </div>
        </div>

        {percentageSpent >= 80 && remaining > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-amber-800">Budget Alert</p>
                <p className="text-sm text-amber-700 mt-1">
                  You've utilized {percentageSpent.toFixed(1)}% of your budget. Consider monitoring your spending closely.
                </p>
              </div>
            </div>
          </div>
        )}

        {remaining <= 0 && (
          <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-red-800">Budget Exceeded</p>
                <p className="text-sm text-red-700 mt-1">
                  Your spending has exceeded the allocated budget. Consider reviewing your expenses.
                </p>
              </div>
            </div>
          </div>
        )}

        {percentageSpent < 50 && (
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-800">Excellent Budget Management</p>
                <p className="text-sm text-emerald-700 mt-1">
                  You're managing your budget well with ₹{remaining} still available.
                </p>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default AllowanceProgress;