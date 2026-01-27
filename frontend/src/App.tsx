import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardPage from './pages/DashboardPage';
import GroupPage from './pages/GroupPage';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoutes';

/**
 * Functional component for Logout.
 * TypeScript infers the return type as JSX.Element.
 */
function Logout(): React.JSX.Element {
  localStorage.clear(); // clear access and refresh token
  return <Navigate to="/login" />; // redirect to login page
}

/**
 * Functional component to ensure fresh registration by clearing local state.
 */
function RegisterAndLogout(): React.JSX.Element {
  localStorage.clear();
  return <Register />;
}

function App(): React.JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              {/* Home is protected; requires a valid access token */}
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/groups"
          element={
            <ProtectedRoute>
              <GroupPage />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="/register" element={<RegisterAndLogout />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
