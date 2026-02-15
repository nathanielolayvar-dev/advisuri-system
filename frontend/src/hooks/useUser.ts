/**
 * useUser Hook - Fetches and manages the current logged-in user's profile
 * 
 * This hook retrieves the current user's data from the Supabase auth session
 * and fetches their profile from the api_user table.
 * 
 * Security Logic:
 * - Teachers (Staff): is_staff === true - can CREATE groups and ADD members
 * - Students: is_staff === false - can only READ groups and see members
 * 
 * Usage:
 * const { user, isStaff, isLoading, error, refreshUser } = useUser();
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { ApiUser } from '../shared/types';

export interface UseUserReturn {
  /** The current user's profile data from api_user table */
  user: ApiUser | null;
  /** Whether the user is a staff member (teacher) */
  isStaff: boolean;
  /** Whether the user is a student (non-staff) */
  isStudent: boolean;
  /** Loading state while fetching user data */
  isLoading: boolean;
  /** Error message if fetching failed */
  error: Error | null;
  /** Function to refresh the user data */
  refreshUser: () => Promise<void>;
  /** The Supabase auth user ID */
  authId: string | null;
}

export function useUser(): UseUserReturn {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch the current user from Supabase auth and then get their profile
   * from the api_user table
   */
  const fetchUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get the current authenticated user from Supabase
      const { data: { session }, error: authError } = await supabase.auth.getSession();

      if (authError) {
        console.error('Auth session error:', authError);
        setError(new Error(`Authentication error: ${authError.message}`));
        setIsLoading(false);
        return;
      }

      if (!session?.user) {
        // No authenticated user
        setUser(null);
        setIsLoading(false);
        return;
      }

      const authId = session.user.id;

      // Fetch the user's profile from api_user table
      const { data: userData, error: userError } = await supabase
        .from('api_user')
        .select('*')
        .eq('id', authId)
        .single();

      if (userError) {
        console.error('Error fetching user profile:', userError);
        
        // If user doesn't exist in api_user, create a basic profile from auth
        if (userError.code === 'PGRST116') {
          const basicUser: ApiUser = {
            id: authId,
            username: session.user.email?.split('@')[0] || 'Unknown',
            email: session.user.email || '',
            first_name: '',
            last_name: '',
            is_staff: false,
            role: 'student'
          };
          setUser(basicUser);
        } else {
          setError(new Error(`Failed to fetch user: ${userError.message}`));
        }
      } else {
        setUser(userData as ApiUser);
      }
    } catch (err) {
      console.error('Unexpected error in useUser:', err);
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch user on mount
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        await fetchUser();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUser]);

  return {
    user,
    isStaff: user?.is_staff === true,
    isStudent: user?.is_staff === false,
    isLoading,
    error,
    refreshUser: fetchUser,
    authId: user?.id || null
  };
}

export default useUser;
