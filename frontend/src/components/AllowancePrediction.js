import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AllowancePrediction = () => {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchPrediction();
  }, []);

  const fetchPrediction = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/advice/prediction');
      console.log('Prediction response:', response.data);
      setPrediction(response.data);
      setError('');
    } catch (error) {
      console.error('Prediction fetch error:', error);
      setError('Failed to load prediction');
    } finally {
      setLoading(false);
    }
  };

  const getAlertColor = (daysLeft) => {
    if (daysLeft <= 1) return 'text-red-600 bg-red-50 border-red-200';
    if (daysLeft <= 2) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (daysLeft <= 3) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getRecommendationStyle = (type) => {
    switch (type) {
      case 'urgent':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'caution':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'good':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'insight':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <p className="text-red-600 text-center">{error}</p>
        <button onClick={fetchPrediction} className="btn-primary w-full mt-4">
          Try Again
        </button>
      </div>
    );
  }

  if (!prediction?.predictions) {
    return (
      <div className="card">
        <div className="text-center">
          <div className="text-gray-400 text-2xl mb-2">💰</div>
          <p className="text-gray-600">{prediction?.message || 'No active allowance to predict'}</p>
        </div>
      </div>
    );
  }

  const { predictions, confidence, currentTopup, recommendations } = prediction;

  // Safely access nested properties with fallbacks
  const safeCurrentTopup = currentTopup || { amount: 0, remaining: 0 };
  const safePredictions = predictions || { weighted: 0, current: 0, recent3day: 0, historical: 0, pattern: 0 };
  const safeDailyRates = prediction?.dailyRates || { current: 0, recent3day: 0, weekday: 0, weekend: 0 };
  const daysLeft = safePredictions.weighted;

  return (
    <div className="space-y-6 fade-in">
      {/* Main Prediction Display */}
      <div className={`card-neon border-2 ${getAlertColor(daysLeft)}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            🔮 Allowance Duration Prediction
          </h3>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        </div>

        <div className="text-center mb-6">
          <div className="relative inline-block">
            <div className="text-5xl font-bold mb-3 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent bounce-in">
              {daysLeft === 0 ? '< 1' : daysLeft} day{daysLeft !== 1 ? 's' : ''}
            </div>
            <div className="absolute -top-2 -right-2 floating-element">
              <div className="w-4 h-4 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full pulse-ring"></div>
            </div>
          </div>
          <p className="text-base text-gray-600 font-medium mb-4">
            Estimated time remaining at current spending rate
          </p>
          <div className="flex items-center justify-center space-x-6 text-sm bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-3">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="font-medium">Confidence: {confidence || 0}%</span>
            </div>
            <div className="w-1 h-4 bg-gray-300 rounded"></div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="font-medium">₹{safeCurrentTopup.remaining} remaining</span>
            </div>
          </div>
        </div>

        {/* Enhanced Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm font-medium text-gray-600 mb-2">
            <span>₹0</span>
            <span>₹{safeCurrentTopup.amount}</span>
          </div>
          <div className="progress-bar h-4 bg-gradient-to-r from-gray-100 to-gray-200">
            <div
              className={`progress-fill h-4 transition-all duration-1000 ease-out ${
                safeCurrentTopup.remaining / safeCurrentTopup.amount >= 0.5 ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                safeCurrentTopup.remaining / safeCurrentTopup.amount >= 0.2 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 'bg-gradient-to-r from-red-400 to-red-600'
              }`}
              style={{
                width: `${(safeCurrentTopup.remaining / safeCurrentTopup.amount) * 100}%`,
                backgroundSize: '200% 200%',
                animation: 'progressShimmer 2s linear infinite'
              }}
            ></div>
          </div>
          <div className="text-center mt-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
              {Math.round((safeCurrentTopup.remaining / safeCurrentTopup.amount) * 100)}% remaining
            </span>
          </div>
        </div>

        {showDetails && (
          <div className="border-t pt-4 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="text-center">
                <p className="font-medium">{safePredictions.current} days</p>
                <p className="text-gray-500">Current Rate</p>
              </div>
              <div className="text-center">
                <p className="font-medium">{safePredictions.recent3day} days</p>
                <p className="text-gray-500">Recent 3-Day</p>
              </div>
              <div className="text-center">
                <p className="font-medium">{safePredictions.historical} days</p>
                <p className="text-gray-500">Historical Avg</p>
              </div>
              <div className="text-center">
                <p className="font-medium">{safePredictions.pattern} days</p>
                <p className="text-gray-500">Pattern Based</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-md p-3">
              <h4 className="font-medium text-gray-900 mb-2">Spending Analysis</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Daily avg:</span>
                  <span className="font-medium ml-1">₹{safeDailyRates.current}</span>
                </div>
                <div>
                  <span className="text-gray-600">Recent 3-day:</span>
                  <span className="font-medium ml-1">₹{safeDailyRates.recent3day}</span>
                </div>
                <div>
                  <span className="text-gray-600">Weekday avg:</span>
                  <span className="font-medium ml-1">₹{safeDailyRates.weekday}</span>
                </div>
                <div>
                  <span className="text-gray-600">Weekend avg:</span>
                  <span className="font-medium ml-1">₹{safeDailyRates.weekend}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <div className="space-y-4 slide-up">
          {recommendations.map((rec, index) => (
            <div
              key={index}
              className={`card-warm border-l-4 ${getRecommendationStyle(rec.type)} hover:scale-[1.02] transition-all duration-300`}
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    rec.type === 'urgent' ? 'bg-red-100' :
                    rec.type === 'warning' ? 'bg-orange-100' :
                    rec.type === 'caution' ? 'bg-yellow-100' :
                    rec.type === 'good' ? 'bg-green-100' :
                    rec.type === 'insight' ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <span className="text-lg">
                      {rec.type === 'urgent' ? '🚨' :
                       rec.type === 'warning' ? '⚠️' :
                       rec.type === 'caution' ? '💡' :
                       rec.type === 'good' ? '✅' :
                       rec.type === 'insight' ? '📊' : '💬'}
                    </span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold mb-2 leading-relaxed">{rec.message}</p>
                  <p className="text-xs font-medium opacity-75 bg-white/50 rounded-lg px-3 py-1">{rec.action}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Enhanced Quick Actions */}
      <div className="card-cool border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-blue-900 text-lg">💡 Quick Actions</h4>
          <div className="floating-element">
            <div className="w-6 h-6 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">⚡</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => window.location.href = '/add-expense'}
            className="btn-primary text-sm group relative overflow-hidden"
          >
            <span className="relative z-10 flex items-center justify-center space-x-2">
              <span>📝</span>
              <span>Add Expense</span>
            </span>
          </button>
          <button
            onClick={() => window.location.href = '/allowance'}
            className="btn-success text-sm group relative overflow-hidden"
          >
            <span className="relative z-10 flex items-center justify-center space-x-2">
              <span>💰</span>
              <span>Manage Allowance</span>
            </span>
          </button>
        </div>
        <div className="mt-4 text-center">
          <button
            onClick={fetchPrediction}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-white/50 hover:bg-white/80 text-blue-700 font-medium rounded-xl transition-all duration-300 hover:scale-105 backdrop-blur-sm border border-white/30"
          >
            <span>🔄</span>
            <span>Refresh Prediction</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AllowancePrediction;