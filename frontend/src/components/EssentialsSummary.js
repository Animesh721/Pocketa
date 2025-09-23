import React from 'react';

const EssentialsSummary = ({ essentials }) => {
  const { budget, spent, remaining, items } = essentials;

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Essentials</h3>

      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-gray-600">Budget</p>
            <p className="text-lg font-semibold">₹{budget}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Spent</p>
            <p className="text-lg font-semibold">₹{spent}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Remaining</p>
            <p className={`text-lg font-semibold ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ₹{remaining}
            </p>
          </div>
        </div>

        {items && items.length > 0 && (
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Items</h4>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-md">
                  <span className="text-sm">{item.name}</span>
                  <div className="text-right">
                    <span className="text-sm font-medium">₹{item.amount}</span>
                    <p className="text-xs text-gray-500">Due: {item.dueDate}{getOrdinalSuffix(item.dueDate)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {budget > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Usage</span>
              <span>{budget > 0 ? ((spent / budget) * 100).toFixed(1) : 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((spent / budget) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
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

export default EssentialsSummary;