import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from "../../supabaseClient";

interface SidebarContextType {
  isPinned: boolean;
  togglePin: () => void;
  setIsPinned: (value: boolean) => void;
  isHovered: boolean;
  setHovered: (value: boolean) => void;
  userData: { name: string; role: string; id: string } | null; // Added this
  loading: boolean; // Added this
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userData, setUserData] = useState<{ name: string; role: string; id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isHovered, setHovered] = useState(false);
  
  const [isPinned, setIsPinned] = useState<boolean>(() => {
    const saved = localStorage.getItem('sidebarPinned');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Effect for fetching user data (Runs once on mount)
  useEffect(() => {
    const getUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data, error } = await supabase
            .from("api_user")
            .select("username, is_staff")
            .eq("supabase_id", user.id)
            .single();
            
          if (data && !error) {
            setUserData({
              name: data.username,
              role: data.is_staff ? 'Teacher' : 'Student',
              id: user.id.slice(0, 8)
            });
          }
        }
      } catch (err) {
        console.error("Error in SidebarContext:", err);
      } finally {
        setLoading(false);
      }
    };

    getUserProfile();
  }, []);

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