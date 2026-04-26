import { Navigate } from "react-router-dom";
import { useState, useEffect, useRef, ReactNode } from "react";
import { supabase } from '../supabaseClient';

interface ProtectedRouteProps {
  children: ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!isMountedRef.current) return;

        setIsAuthorized(!!session);
      } catch (err) {
        if (isMountedRef.current) {
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
      subscription.unsubscribe();
    };
  }, []);

  if (isAuthorized === null) {
    return <div>Loading...</div>;
  }

  return isAuthorized ? <>{children}</> : <Navigate to="/login" />;
}

export default ProtectedRoute;