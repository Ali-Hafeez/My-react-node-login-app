import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios'; // Make sure to install axios: npm install axios

import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import LoadingSpinner from './components/LoadingSpinner'; // Example component

// Configure Axios base URL and credentials handling globally
axios.defaults.baseURL = 'http://localhost:3001'; // Your backend URL
axios.defaults.withCredentials = true; // IMPORTANT: Send cookies with requests

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Check session on initial load

  useEffect(() => {
    // Check if user is already logged in (check session)
    const checkSession = async () => {
      try {
        const response = await axios.get('/api/check-session');
        if (response.data.isLoggedIn) {
          setUser({ id: response.data.userId, username: response.data.username });
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Error checking session:", error);
        setUser(null); // Assume not logged in on error
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []); // Empty dependency array: run only once on mount

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
  };

  const handleLogout = async () => {
      try {
          await axios.post('/api/logout');
          setUser(null);
      } catch(error) {
          console.error("Logout failed:", error);
          // Maybe show an error message to the user
      }
  };

  if (loading) {
    return <LoadingSpinner />; // Or some other loading indicator
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <LoginPage onLogin={handleLogin} /> : <Navigate to="/dashboard" />} />
        <Route path="/signup" element={!user ? <SignupPage /> : <Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={user ? <DashboardPage user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} /> {/* Default route */}
      </Routes>
    </Router>
  );
}

export default App;