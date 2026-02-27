/**
 * useUser Hook — Fetches and manages the current logged-in user's profile
 *
 * Queries the `users` Supabase table (non-prefixed).
 * Column mapping:
 *   users.user_id   → unique identifier (UUID, matches auth.uid())
 *   users.full_name → display name
 *   users.role      → 'admin' | 'teacher' | 'student'
 *
 * Permission helpers:
 *   isAdmin   → role === 'admin'
 *   isTeacher → role === 'teacher'
 *   isStudent → role === 'student'
 *   isStaff   → role === 'admin' || role === 'teacher'
 *
 * Usage:
 *   const { user, isStaff, isAdmin, isTeacher, isStudent, isLoading, error, refreshUser } = useUser();
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { SupabaseUser } from '../shared/types';

export interface UseUserReturn {
  /** The current user's profile data from the users table */
  user: SupabaseUser | null;
  /** Whether the user is an admin or teacher (can manage groups/tasks) */
  isStaff: boolean;
  /** Whether the user is an admin */
  isAdmin: boolean;
  /** Whether the user is a teacher */
  isTeacher: boolean;
  /** Whether the user is a student */
  isStudent: boolean;
  /** Loading state while fetching user data */
  isLoading: boolean;
  /** Error message if fetching failed */
  error: Error | null;
  /** Function to refresh the user data */
  refreshUser: () => Promise<void>;
  /** The Supabase auth user ID (same as user.user_id) */
  authId: string | null;
}

export function useUser(): UseUserReturn {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession();

      if (authError) {
        console.error('Auth session error:', authError);
        setError(new Error(`Authentication error: ${authError.message}`));
        setIsLoading(false);
        return;
      }

      if (!session?.user) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const authId = session.user.id;

      // Fetch the user's profile from the `users` table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('user_id, full_name, email, role, is_active, created_at, profile_picture_url')
        .eq('user_id', authId)
        .single();

      if (userError) {
        console.error('Error fetching user profile:', userError);

        // If user doesn't exist in users table yet, create a basic profile from auth
        if (userError.code === 'PGRST116') {
          const basicUser: SupabaseUser = {
            user_id: authId,
            full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Unknown',
            email: session.user.email || '',
            role: 'student',
            is_active: true,
            created_at: new Date().toISOString(),
            profile_picture_url: null,
          };
          setUser(basicUser);
        } else {
          setError(new Error(`Failed to fetch user: ${userError.message}`));
        }
      } else {
        setUser(userData as SupabaseUser);
      }
    } catch (err) {
      console.error('Unexpected error in useUser:', err);
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
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
    isAdmin: user?.role === 'admin',
    isTeacher: user?.role === 'teacher',
    isStudent: user?.role === 'student',
    isStaff: user?.role === 'admin' || user?.role === 'teacher',
    isLoading,
    error,
    refreshUser: fetchUser,
    authId: user?.user_id || null,
  };
}

export default useUser;
