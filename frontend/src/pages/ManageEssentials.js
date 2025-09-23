import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ManageEssentials = () => {
  const [essentials, setEssentials] = useState([]);
  const [newEssential, setNewEssential] = useState({
    name: '',
    amount: '',
    dueDate: ''
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    fetchEssentials();
  }, []);

  const fetchEssentials = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/user/settings');
      setEssentials(response.data.essentials);
      setError('');
    } catch (error) {
      console.error('Fetch essentials error:', error);
      setError('Failed to load essentials');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setNewEssential({
      ...newEssential,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newEssential.name || !newEssential.amount || !newEssential.dueDate) {
      setError('Please fill in all fields');
      return;
    }

    if (parseFloat(newEssential.amount) <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    if (parseInt(newEssential.dueDate) < 1 || parseInt(newEssential.dueDate) > 31) {
      setError('Due date must be between 1 and 31');
      return;
    }

    setSubmitting(true);

    try {
      const response = await axios.post('/api/user/essentials', {
        name: newEssential.name.trim(),
        amount: parseFloat(newEssential.amount),
        dueDate: parseInt(newEssential.dueDate)
      });

      setEssentials(response.data.allEssentials);
      setNewEssential({ name: '', amount: '', dueDate: '' });
      setSuccess('Essential added successfully!');

      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Add essential error:', error);
      setError(error.response?.data?.message || 'Failed to add essential');
    } finally {
      setSubmitting(false);
    }
  };

  const getOrdinalSuffix = (day) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-white">Loading essentials...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-blue-400 hover:text-blue-300 text-sm mb-4"
        >
          ← Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold text-white">Manage Monthly Essentials</h1>
        <p className="mt-2 text-slate-300">
          Add or view your fixed monthly expenses
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Add New Essential */}
        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-4">Add New Essential</h2>

          {error && (
            <div className="bg-red-900/30 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg mb-4 backdrop-blur-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-900/30 border border-green-500/50 text-green-300 px-4 py-3 rounded-lg mb-4 backdrop-blur-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-300">
                Name
              </label>
              <input
                type="text"
                name="name"
                id="name"
                value={newEssential.name}
                onChange={handleInputChange}
                className="input-field mt-1"
                placeholder="e.g., Food, Rent, WiFi"
                required
              />
            </div>

            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-slate-300">
                Amount (₹)
              </label>
              <input
                type="number"
                name="amount"
                id="amount"
                value={newEssential.amount}
                onChange={handleInputChange}
                className="input-field mt-1"
                placeholder="2000"
                min="1"
                step="0.01"
                required
              />
            </div>

            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-slate-300">
                Due Date (day of month)
              </label>
              <input
                type="number"
                name="dueDate"
                id="dueDate"
                value={newEssential.dueDate}
                onChange={handleInputChange}
                className="input-field mt-1"
                placeholder="1"
                min="1"
                max="31"
                required
              />
              <p className="text-xs text-slate-400 mt-1">
                Enter the day of the month when this expense is due (1-31)
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full"
            >
              {submitting ? 'Adding...' : 'Add Essential'}
            </button>
          </form>
        </div>

        {/* Current Essentials */}
        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-4">
            Current Essentials ({essentials.length})
          </h2>

          {essentials.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p>No essentials added yet</p>
              <p className="text-sm">Add your first essential using the form on the left</p>
            </div>
          ) : (
            <div className="space-y-3">
              {essentials.map((essential, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-slate-700/50 rounded-md">
                  <div>
                    <p className="font-medium text-white">{essential.name}</p>
                    <p className="text-sm text-slate-400">
                      Due: {essential.dueDate}{getOrdinalSuffix(essential.dueDate)} of each month
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-white">₹{essential.amount}</p>
                  </div>
                </div>
              ))}

              <div className="border-t border-slate-600/50 pt-3 mt-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-white">Total Monthly Budget:</span>
                  <span className="font-bold text-lg text-blue-400">
                    ₹{essentials.reduce((sum, e) => sum + e.amount, 0)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

        <div className="mt-8 card">
          <h3 className="text-sm font-medium text-blue-400 mb-2">💡 Tips:</h3>
          <ul className="text-sm text-slate-300 space-y-1">
            <li>• Add all your fixed monthly expenses like rent, utilities, subscriptions</li>
            <li>• These will appear in your dashboard's Monthly Essentials section</li>
            <li>• Use the "Essentials" category when logging these expenses</li>
            <li>• Missing an essential? Just add it here and it will show up immediately</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ManageEssentials;