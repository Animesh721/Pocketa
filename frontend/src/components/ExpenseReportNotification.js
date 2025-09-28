import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ExpenseReportNotification = () => {
  const [showNotification, setShowNotification] = useState(false);
  const [notificationData, setNotificationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkNotificationStatus();

    // Check every hour for notification status
    const interval = setInterval(checkNotificationStatus, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const checkNotificationStatus = async () => {
    try {
      const response = await axios.get('/api/expense-reports/notification-status');
      const data = response.data;

      setNotificationData(data);
      setShowNotification(data.shouldShowNotification);
      setLoading(false);

      console.log('Notification Status:', data);
    } catch (error) {
      console.error('Error checking notification status:', error);
      setLoading(false);
    }
  };

  const handleViewReport = async () => {
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      // Navigate to the expense report page
      navigate(`/expense-report/${currentMonth}/${currentYear}`);

      // Mark notification as dismissed
      await axios.post('/api/expense-reports/dismiss-notification');
      setShowNotification(false);
    } catch (error) {
      console.error('Error viewing report:', error);
    }
  };

  const handleDismiss = async () => {
    try {
      await axios.post('/api/expense-reports/dismiss-notification');
      setShowNotification(false);
    } catch (error) {
      console.error('Error dismissing notification:', error);
      // Even if API call fails, hide the notification
      setShowNotification(false);
    }
  };

  if (loading || !showNotification || !notificationData) {
    return null;
  }

  const monthName = new Date(notificationData.currentYear, notificationData.currentMonth - 1)
    .toLocaleDateString('en-US', { month: 'long' });

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      {/* Notification Popup */}
      <div className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg shadow-2xl border border-red-400">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="bg-white bg-opacity-20 rounded-full p-2 mr-3">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="font-bold text-lg">Report Ready!</h3>
            </div>
            <button
              onClick={handleDismiss}
              className="text-white hover:text-red-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Message */}
          <p className="text-sm mb-4 leading-relaxed">
            Your <span className="font-semibold">{monthName} {notificationData.currentYear}</span> expense report is ready!
            See where your money went and get insights for better budgeting.
          </p>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <button
              onClick={handleViewReport}
              className="flex-1 bg-white text-red-600 font-semibold py-2 px-4 rounded-md hover:bg-red-50 transition-colors duration-200 text-sm"
            >
              📊 View Report
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-2 text-red-200 hover:text-white transition-colors duration-200 text-sm"
            >
              Later
            </button>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="bg-red-700 bg-opacity-50 px-4 py-2 text-xs rounded-b-lg">
          📅 End of {monthName} - Day {notificationData.currentDay} of {notificationData.daysInMonth}
        </div>
      </div>
    </div>
  );
};

export default ExpenseReportNotification;