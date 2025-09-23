import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = {
  'Allowance': '#0ea5e9',
  'Essentials': '#f59e0b',
  'Extra': '#ef4444'
};

const ExpenseChart = ({ data }) => {
  const chartData = Object.entries(data).map(([category, amount]) => ({
    name: category,
    value: amount,
    color: COLORS[category] || '#6b7280'
  }));

  const totalSpent = chartData.reduce((sum, item) => sum + item.value, 0);

  if (totalSpent === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Spending Breakdown</h3>
        <div className="flex items-center justify-center h-64 text-slate-300">
          <p>No expenses recorded yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-white mb-4">Spending Breakdown</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [`₹${value}`, 'Amount']}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 text-center">
        <p className="text-sm text-slate-300">
          Total Spent: <span className="font-semibold text-white">₹{totalSpent}</span>
        </p>
      </div>
    </div>
  );
};

export default ExpenseChart;