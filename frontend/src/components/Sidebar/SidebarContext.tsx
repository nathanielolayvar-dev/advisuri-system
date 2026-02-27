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
    isAdmin: boolean;
    email?: string;
    firstName?: string;
    lastName?: string;
  } | null;
  loading: boolean;
  isAdminPanelOpen: boolean;
  setAdminPanelOpen: (value: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userData, setUserData] = useState<{ 
    name: string; 
    role: string; 
    id: string;
    isStaff: boolean;
    isAdmin: boolean;
    email?: string;
  } | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [isHovered, setHovered] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [isAdminPanelOpen, setAdminPanelOpen] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const [isPinned, setIsPinned] = useState<boolean>(() => {
    const saved = localStorage.getItem('sidebarPinned');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const getUserProfile = useCallback(async (signal?: AbortSignal) => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
      if (sessionError || !session?.user) {
        setLoading(false);
        return;
      }

      const authUser = session.user;

      // FETCH FROM NEW 'users' TABLE
      const { data, error } = await supabase
        .from("users") // Changed from api_user
        .select("user_id, full_name, email, role")
        .eq("user_id", authUser.id)
        .single();

      if (signal?.aborted) return;

      if (data && !error) {
        // Logic: Role is Teacher if the string matches 'teacher'
        const isTeacherRole = data.role?.toLowerCase() === 'teacher';
        const isAdminRole = data.role?.toLowerCase() === 'admin';

        setUserData({
          name: data.full_name || 'User',
          role: isAdminRole ? 'Admin' : (isTeacherRole ? 'Teacher' : 'Student'),
          id: data.user_id,
          isStaff: isTeacherRole || isAdminRole, 
          isAdmin: isAdminRole,
          email: data.email,
        });
      } else {
        // Fallback if data is missing or error occurs
        setUserData({
          name: authUser.email?.split('@')[0] || 'User',
          role: 'Student',
          id: authUser.id,
          isStaff: false,
          isAdmin: false,
          email: authUser.email
        });
      }
    } catch (err) {
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
      value={{ isPinned, togglePin, setIsPinned, isHovered, setHovered, userData, loading, isAdminPanelOpen, setAdminPanelOpen }}
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