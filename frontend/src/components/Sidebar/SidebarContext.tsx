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

const AUTH_TIMEOUT_MS = 5000;

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
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  
  const [isPinned, setIsPinned] = useState<boolean>(() => {
    const saved = localStorage.getItem('sidebarPinned');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const getUserProfile = useCallback(async (signal?: AbortSignal) => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
      if (sessionError || !session?.user) {
        if (isMountedRef.current) {
          setLoading(false);
        }
        return;
      }

      const authUser = session.user;

      const { data, error } = await supabase
        .from("users")
        .select("user_id, full_name, email, role")
        .eq("user_id", authUser.id)
        .single();

      if (signal?.aborted) return;
      if (!isMountedRef.current) return;

      if (data && !error) {
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
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setAuthReady(true);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    abortControllerRef.current = new AbortController();

    const timeoutId = setTimeout(() => {
      if (isMountedRef.current) {
        setLoading(false);
        setAuthReady(true);
      }
    }, AUTH_TIMEOUT_MS);
    timeoutRef.current = timeoutId;

    getUserProfile(abortControllerRef.current.signal).finally(() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (isMountedRef.current) {
        setLoading(false);
        setAuthReady(true);
      }
    });

    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      abortControllerRef.current?.abort();
    };
  }, [getUserProfile]);

  useEffect(() => {
    if (!authReady) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (!isMountedRef.current) return;
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        abortControllerRef.current?.abort();
        abortControllerRef.current = new AbortController();
        
        setTimeout(() => {
          if (isMountedRef.current) {
            getUserProfile(abortControllerRef.current?.signal);
          }
        }, 100);
      } else if (event === 'SIGNED_OUT') {
        setUserData(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [authReady, getUserProfile]);

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