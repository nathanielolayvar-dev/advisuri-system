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
        // 1. Exchange the OAuth code for a session if present
        const { data: exchangeData, error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(window.location.search);
        if (exchangeError) {
          console.warn('OAuth code exchange issue:', exchangeError);
        }

        // 2. Retrieve the current session after the exchange
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          if (sessionError)
            console.error('Handshake parsing failed:', sessionError);
          navigate('/login', { replace: true });
          return;
        }

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
      } catch (err) {
        console.error('Handshake execution exception:', err);
        navigate('/login', { replace: true });
      }
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

        // Clean local token assignment
        localStorage.setItem(ACCESS_TOKEN, session.access_token);

        const userId = session.user.id;
        const provider = session.user.app_metadata?.provider || 'email';
        const loginKey = `logged_in_${userId}`;

        // SAFETY GATE: If this is a brand new Google registration, skip immediate
        // database audit logs to allow the database triggers to complete seamlessly.
        if (
          provider === 'google' &&
          !sessionStorage.getItem('oauth_verified')
        ) {
          sessionStorage.setItem(loginKey, 'true');
          sessionStorage.setItem('oauth_verified', 'true');
          return;
        }

        // Standard session tracking for established profiles
        if (!sessionStorage.getItem(loginKey)) {
          sessionStorage.setItem(loginKey, 'true');
          try {
            await supabase.from('audit_logs').insert({
              user_id: userId,
              action:
                provider === 'google'
                  ? 'User logged in via Google OAuth'
                  : 'User logged in (Email/Password)',
              resource: 'Authentication',
              status: 'Success',
            });
          } catch (err) {
            console.warn('Background log engine bypassed safely:', err);
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
