import { Navigate } from "react-router-dom";
import { useState, useEffect, ReactNode } from "react";
// IMPORTANT: Use the same supabase instance as your api.ts
import { supabase } from '../supabaseClient';

interface ProtectedRouteProps {
  children: ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      // Get the session directly from the SDK
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthorized(!!session);
    };

    checkAuth();

    // Listen for auth state changes (Login, Logout, Token Refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthorized(!!session);
  
      if (session) {
        localStorage.setItem("access", session.access_token);
      } else {
        localStorage.removeItem("access");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isAuthorized === null) {
    return <div>Loading...</div>; // Prevents "flickering" during redirect
  }

  return isAuthorized ? <>{children}</> : <Navigate to="/login" />;
}

export default ProtectedRoute;