// src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';

import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import LoadingSpinner from './components/LoadingSpinner';

// configure axios
axios.defaults.baseURL = 'http://localhost:3001';
axios.defaults.withCredentials = true;

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // on mount, check session
    const checkSession = async () => {
      try {
        const { data } = await axios.get('/api/check-session');
        if (data.isLoggedIn) {
          setUser({ id: data.userId, username: data.username });
        }
      } catch (err) {
        console.error('Error checking session:', err);
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
  };

  const handleLogout = async () => {
    try {
      await axios.post('/api/logout');
      setUser(null);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            !user
              ? <LoginPage onLogin={handleLogin} />
              : <Navigate to="/dashboard" replace />
          }
        />
        <Route
          path="/signup"
          element={
            !user
              ? <SignupPage onSignup={handleLogin} />
              : <Navigate to="/dashboard" replace />
          }
        />
        <Route
          path="/dashboard"
          element={
            user
              ? <DashboardPage user={user} onLogout={handleLogout} />
              : <Navigate to="/login" replace />
          }
        />
        <Route
          path="*"
          element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
        />
      </Routes>
    </Router>
  );
}

export default App;
