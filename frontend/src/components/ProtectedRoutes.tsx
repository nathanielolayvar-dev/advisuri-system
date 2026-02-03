import { Navigate } from "react-router-dom";
import { useState, useEffect, ReactNode } from "react";
import { supabase } from "../supabaseClient"; 
import { ACCESS_TOKEN } from "../constants";

interface ProtectedRouteProps {
  children: ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      // 1. Get the current session from Supabase
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // 2. Keep localStorage in sync for your Axios interceptor (api.ts)
        localStorage.setItem(ACCESS_TOKEN, session.access_token);
        setIsAuthorized(true);
      } else {
        localStorage.removeItem(ACCESS_TOKEN);
        setIsAuthorized(false);
      }
    };

    checkAuth();

    // 3. Listen for auth state changes (like automatic token refreshes or logouts)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        localStorage.setItem(ACCESS_TOKEN, session.access_token);
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isAuthorized === null) {
    return <div>Loading...</div>;
  }

  // If authorized, show the page; otherwise, kick them to login
  return isAuthorized ? <>{children}</> : <Navigate to="/login" />;
}

export default ProtectedRoute;