/**
 * User Service - Utility functions for fetching and managing users
 * 
 * This module provides functions for fetching user data from Supabase,
 * particularly for fetching students (non-staff users) for group management.
 * 
 * Security Logic:
 * - Teachers (Staff): is_staff === true - can view and manage students
 * - Students: is_staff === false - limited access
 */

import { supabase } from '../supabaseClient';
import { ApiUser } from '../shared/types';

export interface ServiceResult<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Fetch all students (non-staff users) from the database
 * 
 * This function is typically used by teachers to find students
 * that they can add to groups.
 * 
 * @returns Promise<ServiceResult<ApiUser[]>> - Array of student users
 */
export async function getStudents(): Promise<ServiceResult<ApiUser[]>> {
  try {
    const { data, error } = await supabase
      .from('api_user')
      .select('id, username, email, first_name, last_name, is_staff, role')
      .eq('is_staff', false)
      .order('username', { ascending: true });

    if (error) {
      console.error('Error fetching students:', error);
      return {
        data: null,
        error: new Error(`Failed to fetch students: ${error.message}`)
      };
    }

    return {
      data: data as ApiUser[],
      error: null
    };
  } catch (err) {
    console.error('Unexpected error in getStudents:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error occurred')
    };
  }
}

/**
 * Search for users by username or email
 * This is useful for the user search dropdown in MemberManager
 * 
 * @param query - The search query string
 * @param excludeUserId - Optional user ID to exclude from results
 * @returns Promise<ServiceResult<ApiUser[]>> - Array of matching users
 */
export async function searchUsers(
  query: string, 
  excludeUserId?: string
): Promise<ServiceResult<ApiUser[]>> {
  try {
    let supabaseQuery = supabase
      .from('api_user')
      .select('id, username, email, first_name, last_name, is_staff, role')
      .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
      .order('username', { ascending: true })
      .limit(10);

    if (excludeUserId) {
      supabaseQuery = supabaseQuery.neq('id', excludeUserId);
    }

    const { data, error } = await supabaseQuery;

    if (error) {
      console.error('Error searching users:', error);
      return {
        data: null,
        error: new Error(`Failed to search users: ${error.message}`)
      };
    }

    return {
      data: data as ApiUser[],
      error: null
    };
  } catch (err) {
    console.error('Unexpected error in searchUsers:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error occurred')
    };
  }
}

/**
 * Get all users (both teachers and students)
 * 
 * @returns Promise<ServiceResult<ApiUser[]>> - Array of all users
 */
export async function getAllUsers(): Promise<ServiceResult<ApiUser[]>> {
  try {
    const { data, error } = await supabase
      .from('api_user')
      .select('id, username, email, first_name, last_name, is_staff, role')
      .order('username', { ascending: true });

    if (error) {
      console.error('Error fetching users:', error);
      return {
        data: null,
        error: new Error(`Failed to fetch users: ${error.message}`)
      };
    }

    return {
      data: data as ApiUser[],
      error: null
    };
  } catch (err) {
    console.error('Unexpected error in getAllUsers:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error occurred')
    };
  }
}

/**
 * Get a user by their UUID
 * 
 * @param userId - The UUID of the user
 * @returns Promise<ServiceResult<ApiUser>> - User data if found
 */
export async function getUserById(userId: string): Promise<ServiceResult<ApiUser>> {
  try {
    const { data, error } = await supabase
      .from('api_user')
      .select('id, username, email, first_name, last_name, is_staff, role')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      return {
        data: null,
        error: new Error(`Failed to fetch user: ${error.message}`)
      };
    }

    return {
      data: data as ApiUser,
      error: null
    };
  } catch (err) {
    console.error('Unexpected error in getUserById:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error occurred')
    };
  }
}
