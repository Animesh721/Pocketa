import React from 'react';
import { Link } from 'react-router-dom';

const RecentTransactions = ({ transactions = [] }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Allowance':
        return 'bg-blue-900/30 text-blue-400';
      case 'Essentials':
        return 'bg-yellow-900/30 text-yellow-400';
      case 'Extra':
        return 'bg-red-900/30 text-red-400';
      default:
        return 'bg-gray-700/30 text-gray-300';
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Recent Transactions</h3>
          <Link
            to="/add-expense"
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            Add Expense →
          </Link>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-slate-300">
          <p>No transactions yet</p>
          <Link
            to="/add-expense"
            className="mt-2 btn-primary"
          >
            Add Your First Expense
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Recent Transactions</h3>
        <Link
          to="/add-expense"
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          Add Expense →
        </Link>
      </div>

      <div className="space-y-3">
        {transactions.slice(0, 5).map((transaction) => (
          <div key={transaction._id} className="flex items-center justify-between py-3 border-b border-slate-600/50 last:border-b-0">
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white">
                  {transaction.description}
                </p>
                <span className="text-sm font-semibold text-white">
                  -₹{transaction.amount}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(transaction.category)}`}>
                  {transaction.category}
                </span>
                <span className="text-xs text-slate-400">
                  {formatDate(transaction.date)}
                </span>
              </div>
            </div>
          </div>
        ))}

        {transactions.length > 5 && (
          <div className="pt-3 text-center">
            <p className="text-sm text-slate-400">
              Showing 5 of {transactions.length} transactions
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentTransactions;