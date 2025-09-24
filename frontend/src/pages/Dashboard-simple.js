import React from 'react';

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-600/50 p-8 max-w-md w-full">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Dashboard Test</h1>
          <p className="text-slate-300">If you can see this, the component is rendering correctly.</p>
          <p className="text-slate-300 mt-4">The white screen was likely caused by JavaScript errors or API failures.</p>
          <button
            onClick={() => console.log('Button clicked')}
            className="bg-blue-600 text-white px-4 py-2 rounded mt-4"
          >
            Test Button
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;