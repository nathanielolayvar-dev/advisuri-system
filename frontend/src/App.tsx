import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardPage from './pages/DashboardPage';
import GroupPage from './pages/GroupPage';
import AdminPage from './pages/AdminPage';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoutes';
import { ACCESS_TOKEN } from './constants';
import { supabase } from './supabaseClient';
import Analytics from "./pages/AnalyticalPage";
import { SidebarProvider, useSidebar } from './components/Sidebar/SidebarContext';
import { UserProfileProvider } from './contexts/UserProfileContext';

function Logout(): React.JSX.Element {
  localStorage.clear();
  return <Navigate to="/login" />;
}

function RegisterAndLogout(): React.JSX.Element {
  localStorage.clear();
  return <Register />;
}

// Wrapper component to redirect admin users away from certain routes
function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const { userData, loading } = useSidebar();
  const isAdminUser = userData?.isAdmin === true;

  if (loading) {
    return <div>Loading...</div>;
  }

  // If admin, redirect to admin page
  if (isAdminUser) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}

// Wrapper for admin-only routes (redirects non-admins)
function AdminOnlyRoute({ children }: { children: React.ReactNode }) {
  const { userData, loading } = useSidebar();
  const isAdminUser = userData?.isAdmin === true;

  if (loading) {
    return <div>Loading...</div>;
  }

  // If not admin, redirect to dashboard (or groups for students)
  if (!isAdminUser) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function App(): React.JSX.Element {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        localStorage.setItem(ACCESS_TOKEN, session.access_token);
        
        // Get user ID and detect login method
        const userId = session.user.id;
        const provider = session.user.app_metadata?.provider || 'email';
        
        // Create a unique key to prevent duplicate logging on page refresh
        const loginKey = `logged_in_${userId}`;
        
        if (!sessionStorage.getItem(loginKey)) {
          try {
            // Record the successful login in the Audit Logs
            // Using the same structure as AdminPanel.tsx
            const { error: auditError } = await supabase.from('audit_logs').insert({
              user_id: userId,
              action: provider === 'google' ? 'User logged in via Google OAuth' : 'User logged in (Email/Password)',
              resource: 'Authentication',
              status: 'Success'
            });
            
            if (auditError) {
              console.error('Failed to create audit log:', auditError);
            }
            
            // Update the "Last Login" column in the users table
            const { error: userError } = await supabase
              .from('users')
              .update({ 
                last_login: new Date().toISOString() 
              })
              .eq('user_id', userId);
            
            if (userError) {
              console.error('Failed to update last login:', userError);
            }
            
            // Mark this session so we don't duplicate the log until they close the tab
            sessionStorage.setItem(loginKey, 'true');
          } catch (err) {
            console.error('Error in login audit logging:', err);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem(ACCESS_TOKEN);
        sessionStorage.clear(); // Clear the login tracker
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <BrowserRouter>
      <SidebarProvider>
        <UserProfileProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/admin"/>} />
            
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <AdminRouteGuard>
                    <DashboardPage />
                  </AdminRouteGuard>
                </ProtectedRoute>
              }
            />

            <Route
              path="/groups"
              element={
                <ProtectedRoute>
                  <AdminRouteGuard>
                    <GroupPage />
                  </AdminRouteGuard>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminOnlyRoute>
                    <AdminPage />
                  </AdminOnlyRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <AdminRouteGuard>
                    <Analytics />
                  </AdminRouteGuard>
                </ProtectedRoute>
              }
            />

            <Route path="/login" element={<Login />} />
            <Route path="/logout" element={<Logout />} />
            <Route path="/register" element={<RegisterAndLogout />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </UserProfileProvider>
      </SidebarProvider>
    </BrowserRouter>
  );
}

export default App;
