import { Navigate } from "react-router-dom";
import { useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { supabase } from '../supabaseClient';

interface ProtectedRouteProps {
  children: ReactNode;
}

const AUTH_TIMEOUT_MS = 5000;

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const checkAuth = useCallback(async () => {
    const timeoutPromise = new Promise<boolean>((resolve) => {
      timeoutRef.current = setTimeout(() => {
        resolve(false);
      }, AUTH_TIMEOUT_MS);
    });

    try {
      const sessionPromise = supabase.auth.getSession();
      const [sessionResult] = await Promise.race([
        sessionPromise,
        timeoutPromise.then(() => ({ data: { session: null }, error: null }) as any)
      ]);

      if (!isMountedRef.current) return;

      const hasSession = sessionResult?.data?.session !== null;
      setIsAuthorized(hasSession);
    } catch (err) {
      if (isMountedRef.current) {
        console.error('Auth check failed:', err);
        setIsAuthorized(false);
      }
    } finally {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMountedRef.current) {
        setIsAuthorized(!!session);
        if (session) {
          localStorage.setItem("access", session.access_token);
        } else {
          localStorage.removeItem("access");
        }
      }
    });

    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      subscription.unsubscribe();
    };
  }, [checkAuth]);

  if (isAuthorized === null) {
    return <div>Loading...</div>;
  }

  return isAuthorized ? <>{children}</> : <Navigate to="/login" />;
}

export default ProtectedRoute;