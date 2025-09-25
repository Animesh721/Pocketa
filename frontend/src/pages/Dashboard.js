import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ExpenseChart from '../components/ExpenseChart';
import RecentTransactions from '../components/RecentTransactions';
import LoadingSpinner from '../components/LoadingSpinner';
import axios from 'axios';

const Dashboard = () => {
  console.log('🚀 Dashboard component initializing...');

  const { user } = useAuth();
  console.log('👤 User from auth context:', user);

  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [currentAllowance, setCurrentAllowance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    console.log('📊 Dashboard useEffect triggered');
    fetchDashboardData();

    // Refresh data when user returns to the dashboard tab/window
    const handleFocus = () => {
      console.log('📊 Dashboard tab focused, refreshing data...');
      fetchDashboardData();
    };

    window.addEventListener('focus', handleFocus);

    // Cleanup event listener
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      console.log('Fetching dashboard data...');

      const [statsResponse, transactionsResponse, allowanceResponse] = await Promise.all([
        axios.get('/api/stats'),
        axios.get('/api/transactions?limit=10'),
        axios.get('/api/allowance/current')
      ]);

      console.log('Dashboard responses received:', { statsResponse, transactionsResponse, allowanceResponse });
      console.log('Stats data structure:', statsResponse.data);
      console.log('Allowance data structure:', allowanceResponse.data);

      setStats(statsResponse.data);
      setTransactions(transactionsResponse.data.transactions || []);
      setCurrentAllowance(allowanceResponse.data);
      setError('');
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setError(`Failed to load dashboard data: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatPeriodDisplay = () => {
    console.log('📅 formatPeriodDisplay called, stats:', stats);
    if (!stats?.currentPeriod) return '';

    const startDate = new Date(stats.currentPeriod.start);
    const endDate = new Date(stats.currentPeriod.end);
    const isWeekly = stats.currentPeriod.type === 'weekly';

    if (isWeekly) {
      return `${startDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`;
    } else {
      return startDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    }
  };

  console.log('🔍 Dashboard render state:', { loading, error, stats: !!stats, user: !!user });

  if (loading) {
    console.log('⏳ Showing loading spinner');
    return <LoadingSpinner />;
  }

  if (error) {
    console.log('❌ Showing error screen:', error);
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
            <button
              onClick={fetchDashboardData}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 shadow-xl hover:shadow-blue-500/40"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  console.log('✅ Rendering main dashboard content');
  console.log('📊 Final render data:', {
    statsExists: !!stats,
    userExists: !!user,
    statsKeys: stats ? Object.keys(stats) : 'null',
    userKeys: user ? Object.keys(user) : 'null'
  });

  try {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 backdrop-blur-sm border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-4 sm:mb-0">
              <h1 className="text-3xl font-bold text-white">
                Welcome back, {user?.name}
              </h1>
              <p className="text-lg text-slate-300 mt-1">
                {formatPeriodDisplay()}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <button
                onClick={() => window.location.href = '/add-expense'}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium px-6 py-3 rounded-lg transition-all duration-200 shadow-xl hover:shadow-blue-500/40"
              >
                Add Expense
              </button>
              <button
                onClick={() => window.location.href = '/allowance'}
                className="bg-slate-800/50 hover:bg-slate-700/50 text-slate-200 font-medium px-6 py-3 rounded-lg border border-slate-600/50 transition-all duration-200 shadow-lg hover:shadow-xl backdrop-blur-sm"
              >
                Manage Allowance
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Current Allowance Balance */}
            <div className="stat-card animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                {currentAllowance?.hasActiveAllowance && (
                  <span className="text-xs font-medium text-green-400 bg-green-900/30 px-2 py-1 rounded-full">
                    Active
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-2">Current Allowance</h3>
                {currentAllowance?.hasActiveAllowance ? (
                  <div>
                    <p className="text-3xl font-bold text-white mb-2">
                      ₹{currentAllowance.currentTopup.remaining.toLocaleString()}
                    </p>
                    <p className="text-sm text-slate-400 mb-2">Available Balance</p>

                    {/* Show carry-over info if applicable */}
                    {currentAllowance.currentTopup.carryOverAmount > 0 && (
                      <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-2 mb-4">
                        <p className="text-xs text-green-300 font-medium mb-1">
                          Includes Carry-over
                        </p>
                        <div className="flex justify-between text-xs text-green-400">
                          <span>New: ₹{(currentAllowance.currentTopup.originalAmount || 0).toLocaleString()}</span>
                          <span>+ Previous: ₹{currentAllowance.currentTopup.carryOverAmount.toLocaleString()}</span>
                        </div>
                      </div>
                    )}

                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-xs text-slate-300 mb-2">
                        <span>Spent: ₹{currentAllowance.currentTopup.spent.toLocaleString()}</span>
                        <span>{(currentAllowance.currentTopup.spent + currentAllowance.currentTopup.remaining) > 0 ? ((currentAllowance.currentTopup.spent / (currentAllowance.currentTopup.spent + currentAllowance.currentTopup.remaining)) * 100).toFixed(0) : 0}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`progress-fill ${
                            (currentAllowance.currentTopup.spent + currentAllowance.currentTopup.remaining) > 0 && (currentAllowance.currentTopup.spent / (currentAllowance.currentTopup.spent + currentAllowance.currentTopup.remaining)) >= 0.9 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                            (currentAllowance.currentTopup.spent + currentAllowance.currentTopup.remaining) > 0 && (currentAllowance.currentTopup.spent / (currentAllowance.currentTopup.spent + currentAllowance.currentTopup.remaining)) >= 0.7 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 'bg-gradient-to-r from-blue-500 to-blue-600'
                          }`}
                          style={{
                            width: `${(currentAllowance.currentTopup.spent + currentAllowance.currentTopup.remaining) > 0 ? Math.min((currentAllowance.currentTopup.spent / (currentAllowance.currentTopup.spent + currentAllowance.currentTopup.remaining)) * 100, 100) : 0}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-2xl font-bold text-slate-500 mb-1">₹0</p>
                    <p className="text-sm text-slate-400 mb-3">No active allowance</p>
                    <button
                      onClick={() => window.location.href = '/allowance'}
                      className="text-blue-400 hover:text-blue-700 text-sm font-medium"
                    >
                      Add Allowance →
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Essentials Card */}
            <div className="stat-card animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-green-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2zm0 0V9a2 2 0 012-2h14a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-slate-300 bg-slate-700/30 px-2 py-1 rounded-full">
                  Fixed
                </span>
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-2">Essentials</h3>
                <p className="text-3xl font-bold text-white mb-2">
                  ₹{(stats.essentials?.spent || 0).toLocaleString()}
                </p>
                <p className="text-sm text-slate-400">of ₹{(stats.essentials?.budget || 0).toLocaleString()} budgeted</p>
              </div>
            </div>

            {/* Extra Spending Card */}
            <div className="stat-card animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                {(stats.extra?.spent || 0) > 0 && (
                  <span className="text-xs font-medium text-orange-400 bg-orange-900/30 px-2 py-1 rounded-full">
                    Active
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-2">Extra Spending</h3>
                <p className="text-3xl font-bold text-white mb-2">
                  ₹{(stats.extra?.spent || 0).toLocaleString()}
                </p>
                <p className="text-sm text-slate-400">This period</p>
              </div>
            </div>

            {/* Total Spent Card */}
            <div className="stat-card animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-slate-700/30 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-2">Total Spent</h3>
                <p className="text-3xl font-bold text-white mb-2">
                  ₹{(stats.totalSpent || 0).toLocaleString()}
                </p>
                <p className="text-sm text-slate-400">All categories</p>
              </div>
            </div>
          </div>
        )}

        {/* Charts and Transactions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Expense Chart - Takes 2 columns */}
          <div className="lg:col-span-2">
            {stats && <ExpenseChart data={stats.categoryBreakdown} />}
          </div>

          {/* Recent Transactions - Takes 1 column */}
          <div>
            <RecentTransactions transactions={transactions} />
          </div>
        </div>

      </div>
    </div>
  );
  } catch (renderError) {
    console.error('💥 Dashboard render error:', renderError);
    console.error('💥 Error stack:', renderError.stack);
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 max-w-md">
          <h3 className="text-red-400 font-bold mb-2">Dashboard Render Error</h3>
          <p className="text-red-300 text-sm">{renderError.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }
};

export default Dashboard;