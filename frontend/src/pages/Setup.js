import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const Setup = () => {
  const [essentials, setEssentials] = useState([
    { name: '', amount: '', dueDate: '' }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { updateUser } = useAuth();
  const navigate = useNavigate();

  const handleEssentialChange = (index, field, value) => {
    const updatedEssentials = [...essentials];
    updatedEssentials[index][field] = value;
    setEssentials(updatedEssentials);
  };

  const addEssential = () => {
    setEssentials([...essentials, { name: '', amount: '', dueDate: '' }]);
  };

  const removeEssential = (index) => {
    if (essentials.length > 1) {
      const updatedEssentials = essentials.filter((_, i) => i !== index);
      setEssentials(updatedEssentials);
    }
  };


  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      const validEssentials = essentials.filter(
        e => e.name.trim() && e.amount && e.dueDate
      );

      const response = await axios.post('/api/user/settings', {
        essentials: validEssentials.map(e => ({
          name: e.name.trim(),
          amount: parseFloat(e.amount),
          dueDate: parseInt(e.dueDate)
        }))
      });

      updateUser(response.data.user);
      navigate('/dashboard');
    } catch (error) {
      console.error('Setup error:', error);
      setError(error.response?.data?.message || 'Setup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900">
            Setup Your Account
          </h2>
          <p className="mt-2 text-gray-600">
            Configure your essential monthly expenses
          </p>
        </div>

        <div className="bg-white shadow-lg rounded-2xl border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300">
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">
              Monthly Essentials
            </h3>

            <p className="text-gray-600">
              Add fixed monthly expenses like rent, utilities, etc.
            </p>

            {error && (
              <div className="bg-red-50 border border-red-300 text-red-600 px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {essentials.map((essential, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-all duration-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={essential.name}
                      onChange={(e) => handleEssentialChange(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
                      placeholder="e.g., Rent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount (₹)
                    </label>
                    <input
                      type="number"
                      value={essential.amount}
                      onChange={(e) => handleEssentialChange(index, 'amount', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
                      placeholder="2000"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Due Date
                    </label>
                    <input
                      type="number"
                      value={essential.dueDate}
                      onChange={(e) => handleEssentialChange(index, 'dueDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
                      placeholder="1"
                      min="1"
                      max="31"
                    />
                  </div>

                  <div className="flex items-end">
                    {essentials.length > 1 && (
                      <button
                        onClick={() => removeEssential(index)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <button
                onClick={addEssential}
                className="w-full py-2 px-4 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
              >
                + Add Another Essential
              </button>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-2 rounded-md disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-blue-500/25"
              >
                {loading ? 'Setting up...' : 'Complete Setup'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Setup;