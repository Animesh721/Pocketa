import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AllowanceManager = () => {
  const [allowanceHistory, setAllowanceHistory] = useState([]);
  const [currentTopup, setCurrentTopup] = useState(null);
  const [newTopup, setNewTopup] = useState({
    amount: '',
    description: 'Monthly allowance deposit',
    receivedDate: new Date().toISOString().split('T')[0] // Today's date in YYYY-MM-DD format
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedTopups, setExpandedTopups] = useState(new Set());

  const navigate = useNavigate();

  useEffect(() => {
    fetchAllowanceData();

    // Refresh data when user returns to the budget page
    const handleFocus = () => {
      console.log('📊 Budget page focused, refreshing data...');
      fetchAllowanceData();
    };

    window.addEventListener('focus', handleFocus);

    // Cleanup event listener
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const fetchAllowanceData = async () => {
    try {
      setLoading(true);
      const [historyResponse, currentResponse] = await Promise.all([
        axios.get('/api/allowance/history'),
        axios.get('/api/allowance/current')
      ]);

      setAllowanceHistory(historyResponse.data.history || []);
      setCurrentTopup(currentResponse.data.hasActiveAllowance ? currentResponse.data.currentTopup : null);
      setError('');
    } catch (error) {
      console.error('Fetch allowance data error:', error);
      setError('Failed to load allowance data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setNewTopup({
      ...newTopup,
      [e.target.name]: e.target.value
    });
  };

  const handleAddTopup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newTopup.amount || parseFloat(newTopup.amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setSubmitting(true);

    try {
      await axios.post('/api/allowance', {
        amount: parseFloat(newTopup.amount),
        description: newTopup.description,
        receivedDate: newTopup.receivedDate
      });

      setSuccess(`Successfully deposited ₹${newTopup.amount} to your account!`);
      setNewTopup({
        amount: '',
        description: 'Monthly allowance deposit',
        receivedDate: new Date().toISOString().split('T')[0]
      });
      fetchAllowanceData(); // Refresh data

      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Add topup error:', error);
      setError(error.response?.data?.message || 'Failed to record deposit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSyncBalance = async () => {
    try {
      setSubmitting(true);
      const response = await axios.post('/api/allowance/sync-balance');
      setSuccess(`Balance synchronized! Current balance: ₹${response.data.currentBalance}`);
      fetchAllowanceData(); // Refresh data
      setTimeout(() => setSuccess(''), 5000);
    } catch (error) {
      console.error('Sync balance error:', error);
      setError(error.response?.data?.message || 'Failed to sync balance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFixBalance = async () => {
    try {
      setSubmitting(true);
      const response = await axios.post('/api/allowance/fix-balance');
      setSuccess(`Balance corrected! New balance: ₹${response.data.after.currentBalance}`);
      console.log('Balance fix details:', response.data);
      fetchAllowanceData(); // Refresh data
      setTimeout(() => setSuccess(''), 5000);
    } catch (error) {
      console.error('Fix balance error:', error);
      setError(error.response?.data?.message || 'Failed to fix balance');
      setTimeout(() => setError(''), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDaysAgo = (dateString) => {
    const days = Math.floor((Date.now() - new Date(dateString)) / (1000 * 60 * 60 * 24));
    return days === 0 ? 'Today' : days === 1 ? '1 day ago' : `${days} days ago`;
  };

  const toggleExpanded = (topupId) => {
    const newExpanded = new Set(expandedTopups);
    if (newExpanded.has(topupId)) {
      newExpanded.delete(topupId);
    } else {
      newExpanded.add(topupId);
    }
    setExpandedTopups(newExpanded);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-2">Loading allowance data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-blue-400 hover:text-blue-300 text-sm mb-4"
          >
            ← Back to Dashboard
          </button>

          <div>
            <h1 className="text-2xl font-semibold text-white mb-2">
              Allowance Manager
            </h1>
            <p className="text-slate-300">
              Track your allowance deposits and spending history
            </p>
          </div>
        </div>

        {/* Key Metrics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="stat-card">
            <div>
              <p className="text-sm font-medium text-slate-400 mb-2">Total Deposits</p>
              <p className="text-2xl font-semibold text-white">
                ₹{(Array.isArray(allowanceHistory) ? allowanceHistory.reduce((sum, t) => {
                  // For deposits with carry-over, use originalAmount (actual new deposit)
                  // For deposits without carry-over, use the full amount
                  const actualDeposit = t.originalAmount || t.amount;
                  return sum + actualDeposit;
                }, 0) : 0).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="stat-card">
            <div>
              <p className="text-sm font-medium text-slate-400 mb-2">Total Utilized</p>
              <p className="text-2xl font-semibold text-white">
                ₹{(Array.isArray(allowanceHistory) ? allowanceHistory.reduce((sum, t) => sum + (t.spent || 0), 0) : 0).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="stat-card">
            <div>
              <p className="text-sm font-medium text-slate-400 mb-2">Available Balance</p>
              <p className="text-2xl font-semibold text-white">
                ₹{currentTopup ? (currentTopup.remaining || 0).toLocaleString() : '0'}
              </p>
            </div>
          </div>

          <div className="stat-card">
            <div>
              <p className="text-sm font-medium text-slate-400 mb-2">Budget Efficiency</p>
              <p className="text-2xl font-semibold text-white">
                {Array.isArray(allowanceHistory) && allowanceHistory.filter(h => h.daysLasted !== null).length > 0
                  ? Math.round(allowanceHistory.filter(h => h.daysLasted !== null).reduce((sum, h) => sum + h.daysLasted, 0) / allowanceHistory.filter(h => h.daysLasted !== null).length)
                  : 0} days
              </p>
              <p className="text-sm text-slate-400">Avg duration</p>
            </div>
          </div>
        </div>

        {/* Fix Balance Button - Prominent Location */}
        <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-300 font-medium mb-1">Balance Issues?</p>
              <p className="text-xs text-red-400">Click here if your balance doesn't show ₹132 remaining (₹300 - ₹168)</p>
            </div>
            <button
              type="button"
              onClick={handleFixBalance}
              disabled={submitting}
              className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 font-medium"
            >
              {submitting ? 'Fixing...' : 'Fix Balance Now'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Current Status */}
        <div className="card">
          <div className="px-6 py-4 border-b border-slate-600/50">
            <h2 className="text-lg font-medium text-white">
              Account Overview
            </h2>
          </div>
          <div className="p-6">

          {currentTopup ? (
            <div className="space-y-4">
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-slate-200 font-medium">Available Balance</p>
                  <span className="text-xs font-medium text-green-400 bg-green-900/30 px-2 py-1 rounded">ACTIVE</span>
                </div>
                <p className="text-2xl font-semibold text-white mb-1">₹{currentTopup.remaining}</p>
                <p className="text-sm text-slate-400">of ₹{currentTopup.amount} total deposit</p>

                {/* Show carry-over breakdown if applicable */}
                {currentTopup.carryOverAmount > 0 && (
                  <div className="bg-green-900/30 border border-green-600/50 rounded-lg p-2 mt-3">
                    <p className="text-xs text-green-400 font-medium mb-1">Includes Carry-over</p>
                    <div className="flex justify-between text-xs text-green-300">
                      <span>New: ₹{(currentTopup.originalAmount || 0).toLocaleString()}</span>
                      <span>+ Previous: ₹{(currentTopup.carryOverAmount || 0).toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">Utilization Rate</span>
                  <span className="text-white font-medium">{currentTopup.amount > 0 ? ((currentTopup.spent / currentTopup.amount) * 100).toFixed(1) : 0}%</span>
                </div>
                <div className="w-full bg-slate-600 rounded-full h-2">
                  <div
                    className="h-2 bg-blue-500 rounded-full"
                    style={{ width: `${currentTopup.amount > 0 ? Math.min((currentTopup.spent / currentTopup.amount) * 100, 100) : 0}%` }}
                  ></div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="text-center">
                    <p className="text-xs text-slate-400 mb-1">Utilized</p>
                    <p className="text-lg font-semibold text-white">₹{currentTopup.spent}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-400 mb-1">Remaining</p>
                    <p className="text-lg font-semibold text-green-400">₹{currentTopup.remaining}</p>
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-400 space-y-1">
                <p>Received: {formatDate(currentTopup.receivedDate || currentTopup.createdAt)}</p>
                <p>({getDaysAgo(currentTopup.receivedDate || currentTopup.createdAt)})</p>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4">
              <div>
                <p className="text-yellow-400 font-medium">No Active Budget Period</p>
                <p className="text-sm text-yellow-300 mt-1">
                  Add a new deposit to activate your budget tracking
                </p>
              </div>
            </div>
          )}
          </div>
        </div>

        {/* Deposit Recording */}
        <div className="card">
          <div className="px-6 py-4 border-b border-slate-600/50">
            <h2 className="text-lg font-medium text-white">
              Record New Deposit
            </h2>
          </div>
          <div className="p-6">

          {/* Carry-over Feature Info */}
          <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-blue-400 mb-1">Smart Carry-over</h4>
                <p className="text-sm text-blue-300">
                  Any unused money from your previous allowances will automatically be added to your new deposit, so you never lose unspent funds!
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-600/50 text-red-400 px-4 py-3 rounded-md mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-900/30 border border-green-600/50 text-green-400 px-4 py-3 rounded-md mb-4">
              {success}
            </div>
          )}

          <form onSubmit={handleAddTopup} className="space-y-4">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-slate-300">
                Deposit Amount
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-slate-400 sm:text-sm">₹</span>
                </div>
                <input
                  type="number"
                  name="amount"
                  id="amount"
                  value={newTopup.amount}
                  onChange={handleInputChange}
                  className="input-field pl-8"
                  placeholder="5000"
                  min="1"
                  step="0.01"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-300">
                Description
              </label>
              <input
                type="text"
                name="description"
                id="description"
                value={newTopup.description}
                onChange={handleInputChange}
                className="input-field mt-1"
                placeholder="Monthly allowance deposit"
              />
            </div>

            <div>
              <label htmlFor="receivedDate" className="block text-sm font-medium text-slate-300">
                Transaction Date
              </label>
              <input
                type="date"
                name="receivedDate"
                id="receivedDate"
                value={newTopup.receivedDate}
                onChange={handleInputChange}
                className="input-field mt-1"
                max={new Date().toISOString().split('T')[0]} // Can't select future dates
              />
              <p className="text-xs text-slate-400 mt-1">
                Select the date when this deposit was made
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Processing...' : 'Record Deposit'}
              </button>

              {/* Balance Fix Buttons */}
              <div className="pt-3 border-t border-slate-600/50 space-y-2">
                <p className="text-xs text-slate-400 mb-2">
                  Balance not showing correctly? Try these fixes:
                </p>
                <button
                  type="button"
                  onClick={handleFixBalance}
                  disabled={submitting}
                  className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
                >
                  {submitting ? 'Fixing...' : 'Fix Balance (Recommended)'}
                </button>
                <button
                  type="button"
                  onClick={handleSyncBalance}
                  disabled={submitting}
                  className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 disabled:opacity-50 text-sm"
                >
                  {submitting ? 'Syncing...' : 'Sync Balance (Old)'}
                </button>
              </div>
            </div>
          </form>
          </div>
        </div>

        </div>

        {/* Enhanced Transaction History */}
        {allowanceHistory.length > 0 && (
          <div className="mt-8 card overflow-hidden">
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h2 className="text-xl font-semibold text-white">Transaction Ledger</h2>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-slate-300 text-sm">{allowanceHistory.length} Records</span>
                  </div>
                  <button className="inline-flex items-center px-3 py-1.5 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all duration-200 text-sm">
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
                    </svg>
                    Filter
                  </button>
                </div>
              </div>
              <p className="text-slate-300 text-sm mt-1">Complete financial transaction history</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
              {allowanceHistory.map((topup, index) => (
                <div key={topup._id} className="relative border border-slate-600/50 rounded-xl p-4 sm:p-6 hover:shadow-lg hover:border-slate-500/70 transition-all duration-300 bg-gradient-to-r from-slate-800/50 to-slate-700/50">
                  {/* Transaction Number - Mobile Responsive */}
                  <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
                    <span className="inline-flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 bg-slate-700 text-slate-300 rounded-full text-xs font-semibold">
                      #{allowanceHistory.length - index}
                    </span>
                  </div>

                  <div className="block sm:flex sm:justify-between sm:items-start">
                    <div className="flex-1 pr-0 sm:pr-6">
                      {/* Amount and Status - Mobile Responsive */}
                      <div className="mb-3 space-y-2 sm:space-y-0">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"></div>
                          <p className="text-xl sm:text-2xl font-bold text-white truncate">
                            ₹{(topup.amount || 0).toLocaleString()}
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
                          {topup.isActive && (
                            <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-green-900/50 to-emerald-900/50 text-green-400 border border-green-600/50 w-fit">
                              <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5 animate-pulse"></div>
                              ACTIVE BUDGET
                            </span>
                          )}
                          {topup.daysLasted && (
                            <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-slate-700/50 to-slate-600/50 text-slate-300 border border-slate-500/50 w-fit">
                              <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {topup.daysLasted} DAYS CYCLE
                            </span>
                          )}
                        </div>
                      </div>
                    <p className="text-sm text-slate-300 mb-3">{topup.description}</p>
                    <div className="space-y-2">
                      <div className="flex items-center text-xs text-slate-400">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Deposited: {formatDate(topup.receivedDate || topup.createdAt)}</span>
                      </div>
                      {topup.depletedDate && (
                        <div className="flex items-center text-xs text-red-400">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          <span>Depleted: {formatDate(topup.depletedDate)}</span>
                        </div>
                      )}
                      {topup.isActive && !topup.depletedDate && (
                        <div className="flex items-center text-xs text-blue-400">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span>Active for: {getDaysAgo(topup.receivedDate || topup.createdAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                    {/* Financial Summary Cards - Mobile Responsive */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-4">
                      <div className="bg-slate-700/30 rounded-lg p-3 sm:p-4 border border-green-600/30">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-green-400 uppercase tracking-wide">Available</span>
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-base sm:text-lg font-bold text-green-400 truncate">₹{((topup.amount || 0) - (topup.spent || 0)).toLocaleString()}</p>
                        <p className="text-xs text-green-300 truncate">{topup.amount > 0 ? ((((topup.amount || 0) - (topup.spent || 0)) / topup.amount) * 100).toFixed(1) : 0}% remaining</p>
                      </div>

                      <div className="bg-slate-700/30 rounded-lg p-3 sm:p-4 border border-slate-600/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-slate-300 uppercase tracking-wide">Utilized</span>
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        </div>
                        <p className="text-base sm:text-lg font-bold text-slate-300 truncate">₹{(topup.spent || 0).toLocaleString()}</p>
                        <p className="text-xs text-slate-400 truncate">{topup.amount > 0 ? (((topup.spent || 0) / topup.amount) * 100).toFixed(1) : 0}% spent</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-slate-300 mb-1">
                        <span>Budget Utilization</span>
                        <span>{topup.amount > 0 ? (((topup.spent || 0) / topup.amount) * 100).toFixed(1) : 0}%</span>
                      </div>
                      <div className="w-full bg-slate-600 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${topup.amount > 0 ? Math.min(((topup.spent || 0) / topup.amount) * 100, 100) : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Right side - Performance Metrics - Mobile Responsive */}
                  <div className="mt-4 sm:mt-0 sm:ml-6 sm:min-w-0 sm:flex-shrink-0">
                    <div className="space-y-2 sm:space-y-3">
                    {topup.daysLasted && (
                      <div className="text-xs text-slate-400">
                        <p className="truncate">Lasted {topup.daysLasted} days</p>
                        {topup.depletedDate && (
                          <p className="truncate">Depleted: {formatDate(topup.depletedDate)}</p>
                        )}
                      </div>
                    )}
                    {!topup.daysLasted && topup.isActive && (
                      <p className="text-xs text-blue-400 truncate">
                        Active for {getDaysAgo(topup.createdAt)}
                      </p>
                    )}
                    </div>
                  </div>

                  {/* Enhanced Transaction Details */}
                  {topup.expenses && topup.expenses.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-slate-600/50">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <p className="text-sm text-slate-300 font-semibold">
                            Transaction Breakdown ({topup.expenseCount} items)
                          </p>
                        </div>
                        <button className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-indigo-400 bg-indigo-900/30 rounded-lg hover:bg-indigo-900/50 transition-colors duration-200">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View Details
                        </button>
                      </div>

                      <div className="space-y-2">
                        {(expandedTopups.has(topup._id) ? topup.expenses : topup.expenses.slice(0, 3)).map((expense, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-gradient-to-r from-slate-700/30 to-slate-600/30 rounded-lg px-3 sm:px-4 py-3 border border-slate-600/50 hover:border-slate-500/70 transition-all duration-200">
                            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1 pr-2">
                              <div className="w-2 h-2 bg-indigo-400 rounded-full flex-shrink-0"></div>
                              <span className="text-sm text-slate-300 font-medium truncate">{expense.description}</span>
                            </div>
                            <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                              <span className="text-sm font-bold text-white">₹{(expense.amount || 0).toLocaleString()}</span>
                              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                        ))}

                        {topup.expenses.length > 3 && (
                          <div className="bg-gradient-to-r from-indigo-900/30 to-blue-900/30 rounded-lg p-3 text-center border border-indigo-600/30">
                            <span className="text-sm text-indigo-300 font-medium">
                              {expandedTopups.has(topup._id)
                                ? `Showing all ${topup.expenses.length} transactions`
                                : `+${topup.expenses.length - 3} additional transactions`
                              }
                            </span>
                            <button
                              onClick={() => toggleExpanded(topup._id)}
                              className="ml-2 text-sm text-indigo-400 hover:text-indigo-300 font-semibold transition-colors duration-200"
                            >
                              {expandedTopups.has(topup._id) ? 'Show Less ↑' : 'Show All →'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
            ))}
            </div>
          </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllowanceManager;