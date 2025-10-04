import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatAdvisor from '../components/ChatAdvisor';
import axios from 'axios';

const AIAdvice = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchAdvice();
  }, []);

  const fetchAdvice = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/advice');
      setSummary(response.data.summary);
      setError('');
    } catch (error) {
      console.error('Fetch advice error:', error);
      setError('Failed to load AI advice. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="card animate-fade-in">
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 mb-6">
                  <div className="loading-dots">
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">AI Financial Advisor</h3>
                <p className="text-slate-300">Analyzing your spending patterns and generating personalized insights...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Top Header Bar */}
      <div className="bg-slate-800/50 border-b border-slate-700/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/dashboard')}
                className="group flex items-center text-blue-400 hover:text-blue-300 text-xs sm:text-sm transition-all duration-300"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Back</span>
              </button>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-base sm:text-lg">🤖</span>
              </div>
              <div className="text-right">
                <h1 className="text-sm sm:text-xl font-bold text-white">AI Financial Advisor</h1>
                <p className="text-xs sm:text-sm text-slate-400 hidden sm:block">Smart insights for your finances</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-600/50 p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-r from-red-500 to-red-600 mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Unable to Load AI Insights</h3>
              <p className="text-red-400 mb-6">{error}</p>
              <button
                onClick={fetchAdvice}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6 space-y-3 sm:space-y-6">

            {/* Main Chat Area - Full Width */}
            <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-hidden" style={{ height: '60vh', minHeight: '400px' }}>
              <ChatAdvisor />
            </div>

            {/* Bottom Section - Financial Overview Components */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">

              {/* Quick Overview */}
              {summary && (
                <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl shadow-lg border border-slate-600/50 p-4 sm:p-6">
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-r from-green-600 to-green-700 rounded-lg flex items-center justify-center mr-2 sm:mr-3">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    Quick Overview
                  </h3>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div className="text-center p-2 sm:p-3 bg-slate-700/50 rounded-lg">
                      <p className="text-xs sm:text-sm text-slate-400 mb-1">Budget</p>
                      <p className="text-sm sm:text-lg font-bold text-white">₹{summary.allowance.budget}</p>
                    </div>
                    <div className="text-center p-2 sm:p-3 bg-slate-700/50 rounded-lg">
                      <p className="text-xs sm:text-sm text-slate-400 mb-1">Spent</p>
                      <p className="text-sm sm:text-lg font-bold text-white">₹{summary.allowance.spent}</p>
                    </div>
                    <div className="text-center p-2 sm:p-3 bg-slate-700/50 rounded-lg">
                      <p className="text-xs sm:text-sm text-slate-400 mb-1">Remaining</p>
                      <p className={`text-sm sm:text-lg font-bold ${summary.allowance.remaining >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ₹{summary.allowance.remaining}
                      </p>
                    </div>
                    <div className="text-center p-2 sm:p-3 bg-slate-700/50 rounded-lg">
                      <p className="text-xs sm:text-sm text-slate-400 mb-1">Extra</p>
                      <p className="text-sm sm:text-lg font-bold text-red-400">₹{summary.extra.spent}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl shadow-lg border border-slate-600/50 p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg flex items-center justify-center mr-2 sm:mr-3">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  Quick Actions
                </h3>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <button
                    onClick={() => navigate('/add-expense')}
                    className="flex items-center justify-center p-3 bg-slate-700/50 hover:bg-slate-700/70 rounded-lg transition-colors text-left"
                  >
                    <svg className="w-5 h-5 text-slate-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-slate-300 text-sm">Add Expense</span>
                  </button>
                  <button
                    onClick={() => navigate('/allowance')}
                    className="flex items-center justify-center p-3 bg-slate-700/50 hover:bg-slate-700/70 rounded-lg transition-colors text-left"
                  >
                    <svg className="w-5 h-5 text-slate-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    <span className="text-slate-300 text-sm">Manage Budget</span>
                  </button>
                  <button
                    onClick={() => navigate('/expense-report')}
                    className="flex items-center justify-center p-3 bg-slate-700/50 hover:bg-slate-700/70 rounded-lg transition-colors text-left"
                  >
                    <svg className="w-5 h-5 text-slate-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="text-slate-300 text-sm">View Reports</span>
                  </button>
                  <button
                    onClick={fetchAdvice}
                    className="flex items-center justify-center p-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg transition-colors text-left"
                    disabled={loading}
                  >
                    <svg className="w-5 h-5 text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="text-blue-300 text-sm">Refresh Insights</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAdvice;