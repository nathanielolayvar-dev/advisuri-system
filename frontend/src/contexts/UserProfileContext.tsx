import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

interface UserProfile {
  user_id: string;
  full_name: string; 
  email: string;
  role: string;    
}

interface UserProfileContextType {
  profile: UserProfile | null;
  isTeacher: boolean;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export const UserProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Session error:', sessionError);
        setLoading(false);
        return;
      }

      const authUser = session?.user;

      if (!authUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      //Fetch from 'users' table (your master table)
      const { data, error: profileError } = await supabase
        .from('users')
        .select('user_id, full_name, email, role')
        .eq('user_id', authUser.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        
        // Handle missing profile case
        if (profileError.code === 'PGRST116') {
          setProfile(null);
        } else {
          setError(profileError.message);
        }
      } else {
        setProfile(data as UserProfile);
      }
    } catch (err) {
      console.error('Error in UserProfileContext:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
        fetchProfile();
    });

    return () => {
        authListener.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const value: UserProfileContextType = {
    profile,
    isTeacher: profile?.role === 'teacher',
    loading,
    error,
    refreshProfile: fetchProfile
  };

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
};

export const useUserProfile = (): UserProfileContextType => {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
};

export default UserProfileContext;