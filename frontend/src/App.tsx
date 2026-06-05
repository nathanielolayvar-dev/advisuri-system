import React, { useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardPage from './pages/DashboardPage';
import GroupPage from './pages/GroupPage';
import AdminPage from './pages/AdminPage';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoutes';
import { ACCESS_TOKEN } from './constants';
import { supabase } from './supabaseClient';
import Analytics from './pages/AnalyticalPage';
import {
  SidebarProvider,
  useSidebar,
} from './components/Sidebar/SidebarContext';
import { UserProfileProvider } from './contexts/UserProfileContext';
import { useIdleTimer } from './hooks/useIdleTimer';
import IdleWarningModal from './components/IdleWarningModal';

// Shared domain check utility
const validateDomain = (email: string | undefined): boolean => {
  if (!email) return false;
  const emailDomain = email.split('@')[1];
  return emailDomain === 'tip.edu.ph';
};

function Logout(): React.JSX.Element {
  localStorage.clear();
  return <Navigate to="/login" />;
}

function RegisterAndLogout(): React.JSX.Element {
  localStorage.clear();
  return <Register />;
}

function AuthCallback(): React.JSX.Element | null {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Set up a dynamic listener to capture the exact moment the tokens clear parsing
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        // We only care if a valid session state event is recognized
        if (session) {
          // 1. ORGANIZATIONAL ENFORCEMENT AT THE OAUTH REDIRECT CALLBACK ENTRY
          if (!validateDomain(session.user?.email)) {
            alert(
              'Access Denied! Please sign in using your official institutional email (@tip.edu.ph).'
            );
            await supabase.auth.signOut();
            localStorage.clear();
            sessionStorage.clear();
            navigate('/login', { replace: true });
            return;
          }

          // Everything checks out! Send them into the application
          navigate('/dashboard', { replace: true });
        } else if (
          event === 'SIGNED_OUT' ||
          (!session && event === 'INITIAL_SESSION')
        ) {
          // If Supabase completely finishes initializing and definitely has no token
          navigate('/login', { replace: true });
        }
      } catch (err) {
        console.error('Unexpected error in auth callback:', err);
        navigate('/login', { replace: true });
      } finally {
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#64748B]">Completing sign in...</p>
        </div>
      </div>
    );
  }

  return null;
}

// Wrapper component to redirect admin users away from certain routes
function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const { userData, loading } = useSidebar();

  if (loading) {
    return <>{children}</>;
  }

  if (userData?.isAdmin === true) {
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

  if (!isAdminUser) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Wrapper component that handles idle timeout
function IdleTimerWrapper({ children }: { children: React.ReactNode }) {
  const { showWarning, remainingTime, logout, stayLoggedIn } = useIdleTimer();

  return (
    <>
      {children}
      <IdleWarningModal
        show={showWarning}
        remainingTime={remainingTime}
        onStayLoggedIn={stayLoggedIn}
        onLogout={logout}
      />
    </>
  );
}

function App(): React.JSX.Element {
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // 2. ORGANIZATIONAL ENFORCEMENT FOR STANDARD LOGIN STATE EMISSIONS
        if (!validateDomain(session.user?.email)) {
          alert(
            'Access Denied! Please sign in using your official institutional email (@tip.edu.ph).'
          );
          await supabase.auth.signOut();
          localStorage.clear();
          sessionStorage.clear();
          window.location.href = '/login'; // Force hard redirect to guarantee context wipe
          return;
        }

        localStorage.setItem(ACCESS_TOKEN, session.access_token);

        const userId = session.user.id;
        const provider = session.user.app_metadata?.provider || 'email';
        const loginKey = `logged_in_${userId}`;

        if (!sessionStorage.getItem(loginKey)) {
          try {
            const { error: auditError } = await supabase
              .from('audit_logs')
              .insert({
                user_id: userId,
                action:
                  provider === 'google'
                    ? 'User logged in via Google OAuth'
                    : 'User logged in (Email/Password)',
                resource: 'Authentication',
                status: 'Success',
              });

            if (auditError) {
              console.error('Failed to create audit log:', auditError);
            }

            const { error: userError } = await supabase
              .from('users')
              .update({
                last_login: new Date().toISOString(),
              })
              .eq('user_id', userId);

            if (userError) {
              console.error('Failed to update last login:', userError);
            }

            sessionStorage.setItem(loginKey, 'true');
          } catch (err) {
            console.error('Error in login audit logging:', err);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem(ACCESS_TOKEN);
        sessionStorage.clear();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* 1. COMPLETELY UNPROTECTED & ISOLATED CLEAN ROUTES */}
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="/register" element={<RegisterAndLogout />} />

        {/* 2. CORE SYSTEM USER PATHS (Wrapped neatly in context states) */}
        <Route
          path="/*"
          element={
            <SidebarProvider>
              <UserProfileProvider>
                <IdleTimerWrapper>
                  <Routes>
                    <Route
                      path="/"
                      element={<Navigate to="/dashboard" replace />}
                    />

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

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </IdleTimerWrapper>
              </UserProfileProvider>
            </SidebarProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
