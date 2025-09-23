import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ChangeEmail = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [currentEmail, setCurrentEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerifyCurrentEmail = async (e) => {
    e.preventDefault();
    setError('');

    if (currentEmail !== user?.email) {
      setError('Current email does not match your account email');
      return;
    }

    setStep(2);
  };

  const handleChangeEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await axios.post('/api/user/change-email', {
        currentEmail,
        newEmail
      });

      setUser({ ...user, email: newEmail });

      // Show success and redirect after 3 seconds
      setStep(3);
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to change email');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white">Change Email Address</h2>
          <p className="mt-2 text-slate-300">Update your account email address</p>
        </div>

        {/* Main Content */}
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-600/50 p-8">
          {step === 1 && (
            <>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-2">Step 1: Verify Current Email</h3>
                <p className="text-slate-300 text-sm">Please enter your current email address to verify your identity.</p>
              </div>

              <form onSubmit={handleVerifyCurrentEmail} className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-slate-300">
                      Current Email Address
                    </label>
                    <button
                      type="button"
                      onClick={() => setCurrentEmail(user?.email || '')}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Use registered email
                    </button>
                  </div>
                  <input
                    type="email"
                    value={currentEmail}
                    onChange={(e) => setCurrentEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your current email"
                    required
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    <strong>Registered email:</strong> {user?.email}
                  </p>
                  {currentEmail && currentEmail !== user?.email && (
                    <p className="text-xs text-red-400 mt-1">
                      ⚠️ This doesn't match your registered email
                    </p>
                  )}
                  {currentEmail && currentEmail === user?.email && (
                    <p className="text-xs text-green-400 mt-1">
                      ✓ Email matches
                    </p>
                  )}
                </div>

                {error && (
                  <div className="p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-300 text-sm">
                    {error}
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex-1 py-3 px-4 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 rounded-lg transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-colors font-medium"
                  >
                    Verify Email
                  </button>
                </div>
              </form>
            </>
          )}

          {step === 2 && (
            <>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-2">Step 2: Enter New Email</h3>
                <p className="text-slate-300 text-sm">Enter your new email address.</p>
              </div>

              <form onSubmit={handleChangeEmail} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    New Email Address
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your new email"
                    required
                  />
                </div>

                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-blue-300 text-sm">
                    <strong>Current:</strong> {currentEmail}<br/>
                    <strong>New:</strong> {newEmail || 'Not entered yet'}
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-300 text-sm">
                    {error}
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 py-3 px-4 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 rounded-lg transition-colors font-medium"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                  >
                    {loading ? 'Changing...' : 'Change Email'}
                  </button>
                </div>
              </form>
            </>
          )}

          {step === 3 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Email Changed Successfully!</h3>
              <p className="text-slate-300 mb-4">Your email has been updated to:</p>
              <p className="text-blue-400 font-medium text-lg mb-4">{newEmail}</p>
              <p className="text-slate-400 text-sm">Redirecting to dashboard in 3 seconds...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChangeEmail;