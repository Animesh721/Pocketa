import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// import axios from 'axios'; // Uncomment when implementing API calls

const UserProfile = () => {
  const navigate = useNavigate();

  // Form state management
  const [formData, setFormData] = useState({
    name: 'John Doe',
    email: 'john.doe@example.com',
    allowanceFrequency: 'monthly',
    allowanceAmount: '5000',
    essentials: [
      { id: 1, category: 'Rent', amount: '2000' },
      { id: 2, category: 'Groceries', amount: '800' },
      { id: 3, category: 'Utilities', amount: '500' }
    ]
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [newEssential, setNewEssential] = useState({ category: '', amount: '' });

  // Load user data on component mount
  useEffect(() => {
    // TODO: Replace with actual API call
    // fetchUserProfile();
  }, []);

  // Placeholder for API call to fetch user data
  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      // const response = await axios.get('/api/user/profile');
      // setFormData(response.data);
    } catch (error) {
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes for main form fields
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle essential item changes
  const handleEssentialChange = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      essentials: prev.essentials.map(essential =>
        essential.id === id ? { ...essential, [field]: value } : essential
      )
    }));
  };

  // Add new essential
  const addEssential = () => {
    if (newEssential.category && newEssential.amount) {
      const newId = Math.max(...formData.essentials.map(e => e.id), 0) + 1;
      setFormData(prev => ({
        ...prev,
        essentials: [...prev.essentials, {
          id: newId,
          category: newEssential.category,
          amount: newEssential.amount
        }]
      }));
      setNewEssential({ category: '', amount: '' });
    }
  };

  // Remove essential
  const removeEssential = (id) => {
    setFormData(prev => ({
      ...prev,
      essentials: prev.essentials.filter(essential => essential.id !== id)
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // TODO: Replace with actual API call
      // await axios.put('/api/user/profile', formData);

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals for summary
  const totalEssentials = formData.essentials.reduce((sum, essential) =>
    sum + parseFloat(essential.amount || 0), 0
  );
  const remainingAllowance = parseFloat(formData.allowanceAmount || 0) - totalEssentials;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header Section */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-blue-400 hover:text-blue-300 text-sm mb-6 transition-all duration-300"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>

          <div>
            <h1 className="text-3xl font-bold text-white mb-2">User Profile</h1>
            <p className="text-slate-300">
              Manage your personal information and allowance settings
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Profile Information Card */}
            <div className="lg:col-span-2 space-y-8">

              {/* Basic Info Section */}
              <div className="card">
                <div className="flex items-center space-x-6 mb-8">
                  {/* Avatar - Using a placeholder with initials */}
                  <div className="relative">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">
                        {formData.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    {/* Camera icon overlay for avatar upload */}
                    <button
                      type="button"
                      className="absolute bottom-0 right-0 bg-slate-700 hover:bg-slate-600 rounded-full p-2 transition-colors"
                    >
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93l.82-1.22A2 2 0 018.17 5h7.66a2 2 0 011.42.58L18.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  </div>

                  {/* Basic user info */}
                  <div className="flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Full Name
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter your full name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter your email"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Allowance Settings Section */}
              <div className="card">
                <h3 className="text-xl font-semibold text-white mb-6">Allowance Settings</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Allowance Frequency
                    </label>
                    <select
                      name="allowanceFrequency"
                      value={formData.allowanceFrequency}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Allowance Amount (₹)
                    </label>
                    <input
                      type="number"
                      name="allowanceAmount"
                      value={formData.allowanceAmount}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter amount"
                    />
                  </div>
                </div>
              </div>

              {/* Monthly Essentials Section */}
              <div className="card">
                <h3 className="text-xl font-semibold text-white mb-6">Monthly Essentials</h3>

                {/* Add new essential form */}
                <div className="mb-6 p-4 bg-slate-700/30 rounded-lg border border-slate-600/50">
                  <h4 className="text-sm font-medium text-slate-300 mb-3">Add New Essential</h4>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newEssential.category}
                      onChange={(e) => setNewEssential(prev => ({ ...prev, category: e.target.value }))}
                      placeholder="Category (e.g., Rent, Food)"
                      className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      value={newEssential.amount}
                      onChange={(e) => setNewEssential(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="Amount"
                      min="0"
                      step="0.01"
                      className="w-32 px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={addEssential}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Essentials list */}
                <div className="space-y-3">
                  {formData.essentials.map((essential) => (
                    <div key={essential.id} className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                      <input
                        type="text"
                        value={essential.category}
                        onChange={(e) => handleEssentialChange(essential.id, 'category', e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex items-center">
                        <span className="text-slate-400 mr-2">₹</span>
                        <input
                          type="number"
                          value={essential.amount}
                          onChange={(e) => handleEssentialChange(essential.id, 'amount', e.target.value)}
                          min="0"
                          step="0.01"
                          className="w-32 px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeEssential(essential.id)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>

                {formData.essentials.length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    <p>No essentials added yet</p>
                    <p className="text-sm">Add your monthly fixed expenses above</p>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar - Summary and Actions */}
            <div className="space-y-6">

              {/* Summary Card */}
              <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4">Summary</h3>

                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-slate-600/50">
                    <span className="text-slate-300">{formData.allowanceFrequency} Allowance</span>
                    <span className="font-semibold text-white">₹{parseFloat(formData.allowanceAmount || 0).toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-slate-600/50">
                    <span className="text-slate-300">Total Essentials</span>
                    <span className="font-semibold text-white">₹{totalEssentials.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-300">Remaining Budget</span>
                    <span className={`font-bold text-lg ${remainingAllowance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ₹{remainingAllowance.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                {/* Success/Error Messages */}
                {success && (
                  <div className="bg-green-900/30 border border-green-600/50 text-green-400 px-4 py-3 rounded-lg">
                    {success}
                  </div>
                )}

                {error && (
                  <div className="bg-red-900/30 border border-red-600/50 text-red-400 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}

                {/* Save Changes Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </div>
                  ) : (
                    'Save Changes'
                  )}
                </button>

                {/* Change Password Link */}
                <button
                  type="button"
                  onClick={() => {
                    // TODO: Navigate to change password page or open modal
                    console.log('Navigate to change password');
                  }}
                  className="w-full text-blue-400 hover:text-blue-300 py-3 px-6 border border-slate-600/50 hover:border-blue-500/50 rounded-lg transition-all duration-200"
                >
                  Change Password
                </button>

                {/* Quick Stats */}
                <div className="card bg-gradient-to-br from-slate-800/50 to-slate-900/50">
                  <h4 className="text-sm font-medium text-slate-300 mb-3">Quick Stats</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Essentials Count</span>
                      <span className="text-white">{formData.essentials.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Budget Utilization</span>
                      <span className="text-white">
                        {parseFloat(formData.allowanceAmount) > 0
                          ? Math.round((totalEssentials / parseFloat(formData.allowanceAmount)) * 100)
                          : 0
                        }%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserProfile;