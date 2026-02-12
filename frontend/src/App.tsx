import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardPage from './pages/DashboardPage';
import GroupPage from './pages/GroupPage';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoutes';
import { ACCESS_TOKEN } from './constants';
import { supabase } from './api';
import Analytics from "./pages/AnalyticalPage"; 
import { SidebarProvider } from './components/Sidebar/SidebarContext';

function Logout(): React.JSX.Element {
  localStorage.clear();
  return <Navigate to="/login" />;
}

function RegisterAndLogout(): React.JSX.Element {
  localStorage.clear();
  return <Register />;
}

function App(): React.JSX.Element {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        localStorage.setItem(ACCESS_TOKEN, session.access_token);
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem(ACCESS_TOKEN);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <BrowserRouter>
      <SidebarProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/groups"/>} />
          
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
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

          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            }
          />

          <Route path="/login" element={<Login />} />
          <Route path="/logout" element={<Logout />} />
          <Route path="/register" element={<RegisterAndLogout />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </SidebarProvider>
    </BrowserRouter>
  );
}

export default App;
