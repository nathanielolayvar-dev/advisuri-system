import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from "../../supabaseClient";

interface SidebarContextType {
  isPinned: boolean;
  togglePin: () => void;
  setIsPinned: (value: boolean) => void;
  isHovered: boolean;
  setHovered: (value: boolean) => void;
  userData: { 
    name: string; 
    role: string; 
    id: string;
    isStaff: boolean;
    email?: string;
    firstName?: string;
    lastName?: string;
  } | null;
  loading: boolean;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userData, setUserData] = useState<{ 
    name: string; 
    role: string; 
    id: string;
    isStaff: boolean;
    email?: string;
    firstName?: string;
    lastName?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isHovered, setHovered] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const [isPinned, setIsPinned] = useState<boolean>(() => {
    const saved = localStorage.getItem('sidebarPinned');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Stable fetch function using useCallback
  const getUserProfile = useCallback(async (signal?: AbortSignal) => {
    try {
      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
      if (sessionError) {
        console.error('Session error:', sessionError);
        return;
      }

      const authUser = session?.user;
        
      if (authUser) {
        console.log('Auth user ID:', authUser.id);
          
        // Fetch user profile from api_user table
        const { data, error } = await supabase
          .from("api_user")
          .select("id, username, first_name, last_name, email, is_staff, role")
          .eq("id", authUser.id)
          .single();
            
        // Check if request was aborted
        if (signal?.aborted) return;
            
        console.log('api_user query result:', { data, error });
            
        if (data && !error) {
          const isStaffUser = data.is_staff === true;
          setUserData({
            name: data.username || data.first_name || 'User',
            role: isStaffUser ? 'Teacher' : 'Student',
            id: data.id,
            isStaff: isStaffUser,
            email: data.email,
            firstName: data.first_name,
            lastName: data.last_name
          });
            
          console.log('User profile loaded:', { 
            username: data.username, 
            isStaff: isStaffUser,
            role: isStaffUser ? 'Teacher' : 'Student'
          });
        } else if (error) {
          console.error('Error fetching user profile:', error.code, error.message);
            
          // Only set as student if it's a "not found" error
          if (error.code === 'PGRST116') {
            console.log('User not found in api_user table - creating default');
            setUserData({
              name: authUser.email?.split('@')[0] || 'User',
              role: 'Student',
              id: authUser.id,
              isStaff: false,
              email: authUser.email
            });
          } else {
            // Other error - use auth email as fallback
            setUserData({
              name: authUser.email?.split('@')[0] || 'User',
              role: 'Student',
              id: authUser.id,
              isStaff: false,
              email: authUser.email
            });
          }
        }
      }
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error("Error in SidebarContext:", err);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    // Initial fetch
    getUserProfile(abortControllerRef.current.signal).finally(() => {
      setLoading(false);
      setAuthReady(true);
    });

    // Cleanup function
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [getUserProfile]);

  // Listen for auth changes (only after initial fetch is done)
  useEffect(() => {
    if (!authReady) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Only re-fetch on SIGNED_IN or TOKEN_REFRESHED
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Abort any pending request
        abortControllerRef.current?.abort();
        abortControllerRef.current = new AbortController();
        
        // Small delay to avoid race conditions
        setTimeout(() => {
          getUserProfile(abortControllerRef.current?.signal);
        }, 100);
      } else if (event === 'SIGNED_OUT') {
        setUserData(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [authReady, getUserProfile]);

  // Effect for persistence (Runs when isPinned changes)
  useEffect(() => {
    localStorage.setItem('sidebarPinned', JSON.stringify(isPinned));
  }, [isPinned]);

  const togglePin = () => setIsPinned((prev) => !prev);

  return (
    <SidebarContext.Provider 
      value={{ isPinned, togglePin, setIsPinned, isHovered, setHovered, userData, loading }}
    >
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};