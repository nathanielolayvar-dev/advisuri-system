import { Navigate } from "react-router-dom";
import { useState, useEffect, useRef, ReactNode } from "react";
import { supabase } from '../supabaseClient';

interface ProtectedRouteProps {
  children: ReactNode;
}

const AUTH_TIMEOUT_MS = 5000;

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const checkAuth = async () => {
      const timeoutId = setTimeout(() => {
        isMountedRef.current = false;
        setIsAuthorized(false);
      }, AUTH_TIMEOUT_MS);
      timeoutRef.current = timeoutId;

      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!isMountedRef.current) return;

        clearTimeout(timeoutId);
        timeoutRef.current = null;
        setIsAuthorized(!!session);
      } catch (err) {
        if (isMountedRef.current) {
          clearTimeout(timeoutId);
          timeoutRef.current = null;
          console.error('Auth check failed:', err);
          setIsAuthorized(false);
        }
      }
    };

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
  }, []);

  if (isAuthorized === null) {
    return <div>Loading...</div>;
  }

  return isAuthorized ? <>{children}</> : <Navigate to="/login" />;
}

export default ProtectedRoute;