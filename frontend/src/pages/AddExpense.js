import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AddExpense = () => {
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category: 'Allowance',
    date: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [isFormValid, setIsFormValid] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState({
    totalExpenses: 0,
    totalTransactions: 0,
    averagePerDay: 0
  });

  const navigate = useNavigate();

  // Validation function
  const validateForm = () => {
    const errors = {};

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      errors.amount = 'Please enter a valid amount greater than 0';
    }

    if (!formData.description.trim()) {
      errors.description = 'Please enter a description';
    } else if (formData.description.trim().length < 3) {
      errors.description = 'Description must be at least 3 characters';
    }

    if (!formData.date) {
      errors.date = 'Please select a date';
    }

    setValidationErrors(errors);
    setIsFormValid(Object.keys(errors).length === 0);
    return Object.keys(errors).length === 0;
  };

  // Real-time validation
  useEffect(() => {
    if (formData.amount || formData.description || formData.date) {
      const errors = {};

      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        errors.amount = 'Please enter a valid amount greater than 0';
      }

      if (!formData.description.trim()) {
        errors.description = 'Please enter a description';
      } else if (formData.description.trim().length < 3) {
        errors.description = 'Description must be at least 3 characters';
      }

      if (!formData.date) {
        errors.date = 'Please select a date';
      }

      setValidationErrors(errors);
      setIsFormValid(Object.keys(errors).length === 0);
    }
  }, [formData]);

  // Load recent expenses and monthly stats
  useEffect(() => {
    const loadData = async () => {
      try {
        const expensesResponse = await axios.get('/api/transactions?limit=5');
        setRecentExpenses(expensesResponse.data.transactions || []);

        const statsResponse = await axios.get('/api/stats');
        const stats = statsResponse.data;

        const currentDate = new Date();
        const currentDay = currentDate.getDate();

        const totalExpenses = (stats.allowance?.spent || 0) + (stats.essentials?.spent || 0) + (stats.extra?.spent || 0);
        const totalTransactions = expensesResponse.data.total || 0;
        const averagePerDay = currentDay > 0 ? totalExpenses / currentDay : 0;

        setMonthlyStats({
          totalExpenses: totalExpenses,
          totalTransactions: totalTransactions,
          averagePerDay: averagePerDay
        });
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };
    loadData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    setError('');
  };

  const handleQuickFill = (expense) => {
    setFormData({
      ...formData,
      amount: expense.amount.toString(),
      description: expense.description,
      category: expense.category
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    setShowConfirmation(true);
  };

  const confirmSubmit = async () => {
    setLoading(true);
    setShowConfirmation(false);

    try {
      await axios.post('/api/transactions', {
        amount: parseFloat(formData.amount),
        description: formData.description.trim(),
        category: formData.category,
        date: formData.date,
        type: 'expense'
      });

      setSuccess('Expense added successfully!');

      // Refresh statistics after adding expense
      try {
        const statsResponse = await axios.get('/api/stats');
        const stats = statsResponse.data;
        const currentDate = new Date();
        const currentDay = currentDate.getDate();
        const totalExpenses = (stats.allowance?.spent || 0) + (stats.essentials?.spent || 0) + (stats.extra?.spent || 0);
        const averagePerDay = currentDay > 0 ? totalExpenses / currentDay : 0;

        setMonthlyStats(prev => ({
          totalExpenses: totalExpenses,
          totalTransactions: prev.totalTransactions + 1,
          averagePerDay: averagePerDay
        }));
      } catch (error) {
        console.error('Failed to refresh stats:', error);
      }

      // Reset form
      setFormData({
        amount: '',
        description: '',
        category: 'Allowance',
        date: new Date().toISOString().split('T')[0]
      });
      setValidationErrors({});
      setIsFormValid(false);

      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Add expense error:', error);
      setError(error.response?.data?.message || 'Failed to add expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Allowance':
        return '💰';
      case 'Essentials':
        return '🏠';
      case 'Extra':
        return '🎁';
      default:
        return '💳';
    }
  };


  if (showConfirmation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-md mx-auto px-4 py-8">
          <div className="card">
            <h2 className="text-xl font-semibold text-white mb-6">Confirm Expense</h2>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-slate-300">Amount:</span>
                <span className="font-semibold text-white">₹{formData.amount}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-300">Description:</span>
                <span className="font-medium text-white">{formData.description}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-300">Category:</span>
                <span className="font-medium text-white">{formData.category}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-300">Date:</span>
                <span className="font-medium text-white">{new Date(formData.date).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-1 px-4 py-2 border border-slate-600 rounded-md text-slate-300 hover:bg-slate-700/50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={confirmSubmit}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-md transition-all duration-200 shadow-lg hover:shadow-blue-500/25"
                disabled={loading}
              >
                {loading ? 'Adding...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-blue-400 hover:text-blue-300 text-sm mb-6"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>

          <div>
            <h1 className="text-2xl font-semibold text-white mb-2">Add Expense</h1>
            <p className="text-slate-300">
              Record a new expense to track your spending
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="card">
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-900/30 border border-red-600/50 p-3 rounded-lg">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="bg-green-900/30 border border-green-600/50 p-3 rounded-lg">
                    <p className="text-sm text-green-400">{success}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="amount" className="block text-sm font-medium text-slate-300">
                    Amount *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-slate-400">₹</span>
                    </div>
                    <input
                      type="number"
                      name="amount"
                      id="amount"
                      required
                      step="0.01"
                      min="0"
                      value={formData.amount}
                      onChange={handleChange}
                      className={`w-full pl-8 pr-3 py-2 border rounded-md focus:outline-none focus:ring-1 bg-slate-700/50 text-white placeholder-slate-400 ${validationErrors.amount ? 'border-red-600/50 focus:ring-red-500' : 'border-slate-600/50 focus:ring-blue-500'}`}
                      placeholder="0.00"
                    />
                  </div>
                  {validationErrors.amount && (
                    <p className="text-sm text-red-400">{validationErrors.amount}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="description" className="block text-sm font-medium text-slate-300">
                    Description *
                  </label>
                  <input
                    type="text"
                    name="description"
                    id="description"
                    required
                    value={formData.description}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 bg-slate-700/50 text-white placeholder-slate-400 ${validationErrors.description ? 'border-red-600/50 focus:ring-red-500' : 'border-slate-600/50 focus:ring-blue-500'}`}
                    placeholder="e.g., Lunch, Bus fare, Subscription"
                  />
                  {validationErrors.description && (
                    <p className="text-sm text-red-400">{validationErrors.description}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="category" className="block text-sm font-medium text-slate-300">
                    Category *
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {['Allowance', 'Essentials', 'Extra'].map((category) => (
                      <label
                        key={category}
                        className={`relative flex flex-col items-center p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                          formData.category === category
                            ? 'border-blue-500 bg-gradient-to-br from-blue-900/30 to-indigo-900/30 shadow-md'
                            : 'border-slate-600/50 bg-slate-700/30 hover:border-slate-500/70 hover:shadow-sm'
                        }`}
                      >
                        <input
                          type="radio"
                          name="category"
                          value={category}
                          checked={formData.category === category}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <span className="text-xl mb-1">{getCategoryIcon(category)}</span>
                        <span className="text-sm font-medium text-white">{category}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="date" className="block text-sm font-medium text-slate-300">
                    Date
                  </label>
                  <input
                    type="date"
                    name="date"
                    id="date"
                    value={formData.date}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 bg-slate-700/50 text-white ${validationErrors.date ? 'border-red-600/50 focus:ring-red-500' : 'border-slate-600/50 focus:ring-blue-500'}`}
                  />
                  {validationErrors.date && (
                    <p className="text-sm text-red-400">{validationErrors.date}</p>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    className="flex-1 px-4 py-2 border border-slate-600 rounded-md text-slate-300 hover:bg-slate-700/50"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-md transition-all duration-200 shadow-lg hover:shadow-blue-500/25 ${!isFormValid ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={loading || !isFormValid}
                  >
                    Add Expense
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card">
              <h3 className="text-sm font-medium text-white mb-3">Category Guide</h3>
              <div className="space-y-2 text-sm text-slate-300">
                <div>• <strong>Allowance:</strong> Regular spending</div>
                <div>• <strong>Essentials:</strong> Monthly fixed costs</div>
                <div>• <strong>Extra:</strong> Special purchases</div>
              </div>
            </div>

            {recentExpenses.length > 0 && (
              <div className="card">
                <h3 className="text-sm font-medium text-white mb-3">Recent</h3>
                <div className="space-y-2">
                  {recentExpenses.slice(0, 3).map((expense, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickFill(expense)}
                      className="w-full text-left p-2 rounded bg-slate-700/50 hover:bg-slate-600/50 text-sm"
                    >
                      <div className="flex justify-between">
                        <span className="text-white">{expense.description}</span>
                        <span className="text-slate-300">₹{expense.amount}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="card">
              <h3 className="text-sm font-medium text-white mb-3">This Month</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-300">Total</span>
                  <span className="font-medium text-white">₹{monthlyStats.totalExpenses.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Transactions</span>
                  <span className="font-medium text-white">{monthlyStats.totalTransactions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Daily avg</span>
                  <span className="font-medium text-white">₹{monthlyStats.averagePerDay.toFixed(0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddExpense;