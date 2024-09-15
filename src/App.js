import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './layouts/DashboardLayout';
import PatientsView from './pages/PatientsView';
import AppointmentsView from './pages/AppointmentsView';

import { Navigate } from 'react-router-dom';

// ProtectedRoute Component to check authentication
const ProtectedRoute = ({ children }) => {
  const authToken = localStorage.getItem('token');

  if (!authToken) {
    // If the user is not authenticated, redirect to login page
    return <Navigate to="/" />;
  }

  // If the user is authenticated, allow access to the protected page
  return children;
};

const App = () => (
  <Router>
    <Routes>
      {/* Public Route for login */}
      <Route path="/" element={<LoginPage />} />

      {/* Protected Route for dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="appointments" />} />
        <Route path="patients" element={<PatientsView />} />
        <Route path="appointments" element={<AppointmentsView />} />
      </Route>
    </Routes>
  </Router>
);

export default App;
