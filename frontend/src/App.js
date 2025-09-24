import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Login from './pages/Login';
import Register from './pages/Register';
import Setup from './pages/Setup';
import Dashboard from './pages/Dashboard-simple';
import AddExpense from './pages/AddExpense';
import AIAdvice from './pages/AIAdvice';
import ManageEssentials from './pages/ManageEssentials';
import AllowanceManager from './pages/AllowanceManager';
import ChangeEmail from './pages/ChangeEmail';
import ChangePassword from './pages/ChangePassword';
import ExpenseReport from './pages/ExpenseReport';
import Navbar from './components/Navbar';
import LoadingSpinner from './components/LoadingSpinner';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

const SetupRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (!user?.setupCompleted) {
    return <Navigate to="/setup" />;
  }

  return children;
};

const AppContent = () => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {isAuthenticated && <Navbar />}
      <main className={isAuthenticated ? 'pt-16' : ''}>
        <Routes>
          <Route
            path="/login"
            element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />}
          />
          <Route
            path="/register"
            element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" />}
          />

          <Route
            path="/setup"
            element={
              <ProtectedRoute>
                {user?.setupCompleted ? <Navigate to="/dashboard" /> : <Setup />}
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <SetupRoute>
                <Dashboard />
              </SetupRoute>
            }
          />

          <Route
            path="/add-expense"
            element={
              <SetupRoute>
                <AddExpense />
              </SetupRoute>
            }
          />

          <Route
            path="/advice"
            element={
              <SetupRoute>
                <AIAdvice />
              </SetupRoute>
            }
          />

          <Route
            path="/manage-essentials"
            element={
              <SetupRoute>
                <ManageEssentials />
              </SetupRoute>
            }
          />

          <Route
            path="/allowance"
            element={
              <SetupRoute>
                <AllowanceManager />
              </SetupRoute>
            }
          />

          <Route
            path="/change-email"
            element={
              <ProtectedRoute>
                <ChangeEmail />
              </ProtectedRoute>
            }
          />

          <Route
            path="/change-password"
            element={
              <ProtectedRoute>
                <ChangePassword />
              </ProtectedRoute>
            }
          />

          <Route
            path="/expense-report"
            element={
              <ProtectedRoute>
                <ExpenseReport />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </main>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;