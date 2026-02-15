/**
 * UserProfileContext - Provides user profile data and isTeacher status
 * 
 * This context fetches and manages the current user's profile from Supabase.
 * It provides:
 * - isTeacher: boolean indicating if user is a teacher (is_staff = true)
 * - profile: the full user profile data
 * - loading: loading state while fetching profile
 * - refreshProfile: function to refresh the profile data
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
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

      // Fetch user profile from api_user table
      const { data, error: profileError } = await supabase
        .from('api_user')
        .select('id, username, email, first_name, last_name, is_staff, role')
        .eq('id', authUser.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        
        // If user not found, create default
        if (profileError.code === 'PGRST116') {
          setProfile({
            id: authUser.id,
            username: authUser.email?.split('@')[0] || 'User',
            email: authUser.email || '',
            first_name: '',
            last_name: '',
            is_staff: false,
            role: 'student'
          });
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

  // Fetch profile on mount
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const value: UserProfileContextType = {
    profile,
    isTeacher: profile?.is_staff === true,
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
