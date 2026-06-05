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
  return <Navigate to="/login" replace />;
}

function RegisterAndLogout(): React.JSX.Element {
  localStorage.clear();
  return <Register />;
}

// ─── STREAMLINED AUTH CALLBACK ─────────────────────────────────────────
function AuthCallback(): React.JSX.Element | null {
  const navigate = useNavigate();

  useEffect(() => {
    const completeHandshake = async () => {
      try {
        // 1. Let Supabase automatically handle parsing the code or hash parameters from the URL
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Handshake parsing failed:', error);
          navigate('/login', { replace: true });
          return;
        }

        const session = data.session;

        if (!session) {
          // Fallback catch: give it a tiny moment if the URL is still initializing
          setTimeout(async () => {
            const { data: retryData } = await supabase.auth.getSession();
            if (retryData.session) {
              handleValidSession(retryData.session);
            } else {
              navigate('/login', { replace: true });
            }
          }, 300);
          return;
        }

        handleValidSession(session);
      } catch (err) {
        console.error('Handshake execution exception:', err);
        navigate('/login', { replace: true });
      }
    };

    const handleValidSession = async (session: any) => {
      // 2. Validate institutional credentials
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

      // 3. Complete authentication registration
      localStorage.setItem(ACCESS_TOKEN, session.access_token);
      navigate('/dashboard', { replace: true });
    };

    completeHandshake();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-[#64748B]">
          Securing institutional workspace credentials...
        </p>
      </div>
    </div>
  );
}

// Wrapper components for route shielding
function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const { userData, loading } = useSidebar();
  if (loading) return <>{children}</>;
  if (userData?.isAdmin === true) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

function AdminOnlyRoute({ children }: { children: React.ReactNode }) {
  const { userData, loading } = useSidebar();
  if (loading)
    return <div className="p-4">Verifying administration permissions...</div>;
  if (userData?.isAdmin !== true) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

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

// ─── MAIN APP ROUTER CONTAINER ──────────────────────────────────────────
function App(): React.JSX.Element {
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        if (!validateDomain(session.user?.email)) return;

        // Synchronous assignment happens universally
        localStorage.setItem(ACCESS_TOKEN, session.access_token);

        const userId = session.user.id;
        const provider = session.user.app_metadata?.provider || 'email';
        const loginKey = `logged_in_${userId}`;

        // Standard session log entry (Bypassed with try/catch to ensure it NEVER blocks navigation)
        if (!sessionStorage.getItem(loginKey)) {
          sessionStorage.setItem(loginKey, 'true');
          try {
            supabase
              .from('audit_logs')
              .insert({
                user_id: userId,
                action:
                  provider === 'google'
                    ? 'User logged in via Google OAuth'
                    : 'User logged in (Email/Password)',
                resource: 'Authentication',
                status: 'Success',
              })
              .then(({ error }) => {
                if (error)
                  console.warn('Non-blocking log engine message:', error);
              });
          } catch (err) {
            console.warn('Background log engine error bypassed:', err);
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
        {/* Unprotected isolated landing paths */}
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="/register" element={<RegisterAndLogout />} />

        {/* System core core workflows under unified environment status context wrappers */}
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
