/**
 * User Service — Utility functions for fetching and managing users
 *
 * Uses the `users` Supabase table (non-prefixed).
 * Column mapping:
 *   users.user_id   → unique identifier (UUID, matches auth.uid())
 *   users.full_name → display name
 *   users.email     → email address
 *   users.role      → 'admin' | 'teacher' | 'student'
 *   users.is_active → account status
 */

import { supabase } from '../supabaseClient';
import { SupabaseUser } from '../shared/types';

export interface ServiceResult<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Fetch all students from the database
 */
export async function getStudents(): Promise<ServiceResult<SupabaseUser[]>> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('user_id, full_name, email, role, is_active, created_at, profile_picture_url')
      .eq('role', 'student')
      .order('full_name', { ascending: true });

    if (error) {
      console.error('Error fetching students:', error);
      return { data: null, error: new Error(`Failed to fetch students: ${error.message}`) };
    }

    return { data: data as SupabaseUser[], error: null };
  } catch (err) {
    console.error('Unexpected error in getStudents:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error occurred') };
  }
}

/**
 * Search for users by full_name or email
 *
 * @param query          - The search query string
 * @param excludeUserId  - Optional user_id to exclude from results
 */
export async function searchUsers(
  query: string,
  excludeUserId?: string
): Promise<ServiceResult<SupabaseUser[]>> {
  try {
    let supabaseQuery = supabase
      .from('users')
      .select('user_id, full_name, email, role, is_active, created_at, profile_picture_url')
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
      .order('full_name', { ascending: true })
      .limit(10);

    if (excludeUserId) {
      supabaseQuery = supabaseQuery.neq('user_id', excludeUserId);
    }

    const { data, error } = await supabaseQuery;

    if (error) {
      console.error('Error searching users:', error);
      return { data: null, error: new Error(`Failed to search users: ${error.message}`) };
    }

    return { data: data as SupabaseUser[], error: null };
  } catch (err) {
    console.error('Unexpected error in searchUsers:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error occurred') };
  }
}

/**
 * Get all users (teachers, students, admins)
 */
export async function getAllUsers(): Promise<ServiceResult<SupabaseUser[]>> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('user_id, full_name, email, role, is_active, created_at, profile_picture_url')
      .order('full_name', { ascending: true });

    if (error) {
      console.error('Error fetching users:', error);
      return { data: null, error: new Error(`Failed to fetch users: ${error.message}`) };
    }

    return { data: data as SupabaseUser[], error: null };
  } catch (err) {
    console.error('Unexpected error in getAllUsers:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error occurred') };
  }
}

/**
 * Get a single user by their UUID (user_id)
 *
 * @param userId - The UUID of the user (matches auth.uid())
 */
export async function getUserById(userId: string): Promise<ServiceResult<SupabaseUser>> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('user_id, full_name, email, role, is_active, created_at, profile_picture_url')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      return { data: null, error: new Error(`Failed to fetch user: ${error.message}`) };
    }

    return { data: data as SupabaseUser, error: null };
  } catch (err) {
    console.error('Unexpected error in getUserById:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error occurred') };
  }
}

/**
 * Update a user's role (admin only function)
 *
 * @param userId - The UUID of the user to update
 * @param newRole - The new role to assign ('admin', 'teacher', or 'student')
 */
export async function updateUserRole(
  userId: string,
  newRole: 'admin' | 'teacher' | 'student'
): Promise<ServiceResult<SupabaseUser>> {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('user_id', userId)
      .select('user_id, full_name, email, role, is_active, created_at, profile_picture_url')
      .single();

    if (error) {
      console.error('Error updating user role:', error);
      return { data: null, error: new Error(`Failed to update user role: ${error.message}`) };
    }

    return { data: data as SupabaseUser, error: null };
  } catch (err) {
    console.error('Unexpected error in updateUserRole:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error occurred') };
  }
}
