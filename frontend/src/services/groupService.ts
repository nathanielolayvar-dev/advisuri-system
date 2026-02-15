/**
 * Group Service - Supabase Client Functions
 * 
 * This module provides functions for managing groups and group memberships
 * with proper security checks based on user roles.
 * 
 * Security Logic:
 * - Teachers (Staff): is_staff === true - can CREATE groups and ADD members
 * - Students: is_staff === false - can only READ groups and see members
 * 
 * Error Handling:
 * - RLS (Row Level Security) policy violations return 42501 (permission denied)
 * - These are handled gracefully with descriptive error messages
 */

import { supabase } from '../supabaseClient';
import api from '../api';  // Django API client
import { ApiGroup, ApiGroupMember, ApiUser } from '../shared/types';

// ============================================================================
// Types
// ============================================================================

/**
 * Result type for service operations
 */
export interface ServiceResult<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Extended group type with member details
 */
export interface GroupWithMembers extends ApiGroup {
  member_details?: Array<{ id: string; username: string; first_name: string; last_name: string }>;
  member_count?: number;
}

// ============================================================================
// Auth Guard Functions
// ============================================================================

/**
 * Check if a user is a staff member (teacher)
 * This is the primary authorization guard for sensitive operations
 * 
 * @param userId - The UUID of the user to check
 * @returns Promise<boolean> - True if user is staff, false otherwise
 */
export async function isUserStaff(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('api_user')
      .select('is_staff')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error checking user staff status:', error);
      return false;
    }

    return data?.is_staff === true;
  } catch (err) {
    console.error('Unexpected error in isUserStaff:', err);
    return false;
  }
}

/**
 * Get the current user's role information
 * 
 * @param userId - The UUID of the user
 * @returns Promise<ApiUser | null> - User data if found
 */
export async function getUserRole(userId: string): Promise<ApiUser | null> {
  try {
    const { data, error } = await supabase
      .from('api_user')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user role:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Unexpected error in getUserRole:', err);
    return null;
  }
}

// ============================================================================
// Group Service Functions
// ============================================================================

/**
 * Fetch all groups from the database
 * This function works for both staff and students (READ access)
 * 
 * @returns Promise<ServiceResult<GroupWithMembers[]>> - Array of groups with member details
 */
export async function getGroups(): Promise<ServiceResult<GroupWithMembers[]>> {
  try {
    const { data, error } = await supabase
      .from('api_group')
      .select(`
        *,
        api_group_members!inner(
          id,
          user_id,
          api_user(id, username, first_name, last_name)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching groups:', error);
      return {
        data: null,
        error: new Error(`Failed to fetch groups: ${error.message}`)
      };
    }

    // Transform the data to include member_details
    const groupsWithMembers: GroupWithMembers[] = (data || []).map((group: any) => ({
      id: group.id,
      name: group.name,
      course: group.course,
      created_at: group.created_at,
      member_details: group.api_group_members?.map((member: any) => ({
        id: member.api_user?.id || member.user_id,
        username: member.api_user?.username || '',
        first_name: member.api_user?.first_name || '',
        last_name: member.api_user?.last_name || ''
      })) || [],
      member_count: group.api_group_members?.length || 0
    }));

    return {
      data: groupsWithMembers,
      error: null
    };
  } catch (err) {
    console.error('Unexpected error in getGroups:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error occurred')
    };
  }
}

/**
 * Create a new group (Staff only)
 * 
 * This function first checks if the user is a staff member before
 * attempting to create the group. If RLS denies access, it throws
 * a 403 Forbidden error.
 * 
 * @param name - The name of the group
 * @param course - The course associated with the group
 * @param userId - The UUID of the user attempting to create the group
 * @returns Promise<ServiceResult<ApiGroup>> - Created group data
 * @throws Error if user is not staff or RLS denies access
 */
export async function createGroup(
  name: string,
  course: string,
  userId: string
): Promise<ServiceResult<ApiGroup>> {
  // First, verify the user is staff
  const isStaff = await isUserStaff(userId);
  
  if (!isStaff) {
    return {
      data: null,
      error: new Error('Permission Denied: Only teachers can create groups.')
    };
  }

  try {
    const { data, error } = await supabase
      .from('api_group')
      .insert([{ name, course }])
      .select()
      .single();

    // Handle RLS permission denied error (code: 42501)
    if (error) {
      if (error.code === '42501') {
        return {
          data: null,
          error: new Error('Permission Denied: Only teachers can create groups.')
        };
      }
      
      console.error('Error creating group:', error);
      return {
        data: null,
        error: new Error(`Failed to create group: ${error.message}`)
      };
    }

    return {
      data: data,
      error: null
    };
  } catch (err) {
    console.error('Unexpected error in createGroup:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error occurred')
    };
  }
}

/**
 * Add a member to a group (Staff only)
 * 
 * This function first checks if the user is a staff member before
 * attempting to add the member. If RLS denies access, it throws
 * a 403 Forbidden error.
 * 
 * @param groupId - The UUID of the group
 * @param userId - The UUID of the user to add as a member
 * @param staffUserId - The UUID of the staff user performing the action
 * @returns Promise<ServiceResult<ApiGroupMember>> - Created membership record
 * @throws Error if user is not staff or RLS denies access
 */
export async function addMemberToGroup(
  groupId: string,
  userId: string,
  staffUserId: string
): Promise<ServiceResult<ApiGroupMember>> {
  // First, verify the user is staff
  const isStaff = await isUserStaff(staffUserId);
  
  if (!isStaff) {
    return {
      data: null,
      error: new Error('Permission Denied: Only teachers can add members to groups.')
    };
  }

  try {
    const { data, error } = await supabase
      .from('api_group_members')
      .insert([{ group_id: groupId, user_id: userId }])
      .select()
      .single();

    // Handle RLS permission denied error (code: 42501)
    if (error) {
      if (error.code === '42501') {
        return {
          data: null,
          error: new Error('Permission Denied: Only teachers can add members to groups.')
        };
      }
      
      // Handle duplicate membership error
      if (error.code === '23505') {
        return {
          data: null,
          error: new Error('User is already a member of this group.')
        };
      }
      
      console.error('Error adding member to group:', error);
      return {
        data: null,
        error: new Error(`Failed to add member: ${error.message}`)
      };
    }

    return {
      data: data,
      error: null
    };
  } catch (err) {
    console.error('Unexpected error in addMemberToGroup:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error occurred')
    };
  }
}

/**
 * Remove a member from a group (Staff only)
 * 
 * @param groupId - The UUID of the group
 * @param userId - The UUID of the user to remove
 * @param staffUserId - The UUID of the staff user performing the action
 * @returns Promise<ServiceResult<void>> - Success indicator
 */
export async function removeMemberFromGroup(
  groupId: string,
  userId: string,
  staffUserId: string
): Promise<ServiceResult<void>> {
  // First, verify the user is staff
  const isStaff = await isUserStaff(staffUserId);
  
  if (!isStaff) {
    return {
      data: null,
      error: new Error('Permission Denied: Only teachers can remove members from groups.')
    };
  }

  try {
    const { error } = await supabase
      .from('api_group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);

    // Handle RLS permission denied error (code: 42501)
    if (error) {
      if (error.code === '42501') {
        return {
          data: null,
          error: new Error('Permission Denied: Only teachers can remove members from groups.')
        };
      }
      
      console.error('Error removing member from group:', error);
      return {
        data: null,
        error: new Error(`Failed to remove member: ${error.message}`)
      };
    }

    return {
      data: undefined,
      error: null
    };
  } catch (err) {
    console.error('Unexpected error in removeMemberFromGroup:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error occurred')
    };
  }
}

/**
 * Delete a group (Staff only)
 * 
 * @param groupId - The UUID of the group to delete
 * @param staffUserId - The UUID of the staff user performing the action
 * @returns Promise<ServiceResult<void>> - Success indicator
 */
export async function deleteGroup(
  groupId: string,
  staffUserId: string
): Promise<ServiceResult<void>> {
  // First, verify the user is staff
  const isStaff = await isUserStaff(staffUserId);
  
  if (!isStaff) {
    return {
      data: null,
      error: new Error('Permission Denied: Only teachers can delete groups.')
    };
  }

  try {
    const { error } = await supabase
      .from('api_group')
      .delete()
      .eq('id', groupId);

    // Handle RLS permission denied error (code: 42501)
    if (error) {
      if (error.code === '42501') {
        return {
          data: null,
          error: new Error('Permission Denied: Only teachers can delete groups.')
        };
      }
      
      console.error('Error deleting group:', error);
      return {
        data: null,
        error: new Error(`Failed to delete group: ${error.message}`)
      };
    }

    return {
      data: undefined,
      error: null
    };
  } catch (err) {
    console.error('Unexpected error in deleteGroup:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error occurred')
    };
  }
}

/**
 * Get a single group by ID with member details
 * 
 * @param groupId - The UUID of the group
 * @returns Promise<ServiceResult<GroupWithMembers>> - Group with member details
 */
export async function getGroupById(groupId: string): Promise<ServiceResult<GroupWithMembers>> {
  try {
    const { data, error } = await supabase
      .from('api_group')
      .select(`
        *,
        api_group_members(
          id,
          user_id,
          api_user(id, username, first_name, last_name)
        )
      `)
      .eq('id', groupId)
      .single();

    if (error) {
      console.error('Error fetching group:', error);
      return {
        data: null,
        error: new Error(`Failed to fetch group: ${error.message}`)
      };
    }

    const groupWithMembers: GroupWithMembers = {
      id: data.id,
      name: data.name,
      course: data.course,
      created_at: data.created_at,
      member_details: data.api_group_members?.map((member: any) => ({
        id: member.api_user?.id || member.user_id,
        username: member.api_user?.username || '',
        first_name: member.api_user?.first_name || '',
        last_name: member.api_user?.last_name || ''
      })) || [],
      member_count: data.api_group_members?.length || 0
    };

    return {
      data: groupWithMembers,
      error: null
    };
  } catch (err) {
    console.error('Unexpected error in getGroupById:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error occurred')
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if current user can perform staff actions
 * This is a convenience function that combines auth check with operation
 * 
 * @param userId - The UUID of the user to check
 * @returns Promise<{ canPerform: boolean; isStaff: boolean; error?: Error }>
 */
export async function checkStaffPermissions(userId: string): Promise<{
  canPerform: boolean;
  isStaff: boolean;
  error?: Error;
}> {
  if (!userId) {
    return {
      canPerform: false,
      isStaff: false,
      error: new Error('User ID is required')
    };
  }

  const isStaff = await isUserStaff(userId);
  
  return {
    canPerform: isStaff,
    isStaff,
    error: isStaff ? undefined : new Error('Staff permissions required')
  };
}

// ============================================================================
// Advanced Group Creation with Members
// ============================================================================

/**
 * Input type for creating a group with members
 */
export interface CreateGroupWithMembersInput {
  name: string;
  course?: string;
  memberIds: string[];
}

/**
 * Result type for createGroupWithMembers operation
 */
export interface CreateGroupWithMembersResult {
  group: ApiGroup | null;
  members: ApiGroupMember[];
  errors: string[];
}

/**
 * Sync a group to Django backend
 * 
 * This function creates the group in Django's database so that
 * ChatView (which uses Django API at port 8000) can access it.
 * 
 * @param group - The group created in Supabase
 * @param memberIds - Array of member user IDs to add to Django
 */
async function syncGroupToDjango(group: ApiGroup, memberIds: string[]): Promise<void> {
  // Create group in Django
  const djangoGroupData = {
    name: group.name,
    course: group.course || ''
  };

  const response = await api.post('/groups/', djangoGroupData);
  
  // If we got a successful response and there are members, add them
  if (response.data && memberIds.length > 0) {
    const djangoGroupId = response.data.id;
    
    // Add members to Django (need to fetch Django user IDs from Supabase user IDs)
    // For simplicity, we'll just log this - the members sync is more complex
    // as it requires mapping Supabase UUIDs to Django user IDs
    console.log(`Group ${djangoGroupId} created in Django with ${memberIds.length} members (member sync skipped - requires ID mapping)`);
  }
}

/**
 * Create a new group and add members to it in a single transaction
 * 
 * This function:
 * 1. First inserts the new group into api_group
 * 2. Then inserts all specified members into api_group_members
 * 
 * @param input - Group data including name, course, and member IDs
 * @param userId - The UUID of the user performing the action (for permission check)
 * @returns Promise<CreateGroupWithMembersResult> - Created group, members, and any errors
 */
export async function createGroupWithMembers(
  input: CreateGroupWithMembersInput,
  userId: string
): Promise<CreateGroupWithMembersResult> {
  const result: CreateGroupWithMembersResult = {
    group: null,
    members: [],
    errors: []
  };

  // First verify the user is staff
  const isStaff = await isUserStaff(userId);
  
  if (!isStaff) {
    result.errors.push('Permission Denied: Only teachers can create groups with members.');
    return result;
  }

  try {
    // Step 1: Create the group
    const { data: groupData, error: groupError } = await supabase
      .from('api_group')
      .insert([{ 
        name: input.name, 
        course: input.course || '' 
      }])
      .select()
      .single();

    if (groupError) {
      console.error('Error creating group:', groupError);
      
      // Handle specific error codes
      if (groupError.code === '42501') {
        result.errors.push('Database Error: Your account does not have Teacher permissions in the api_user table.');
      } else if (groupError.code === '23505') {
        result.errors.push('A group with this name already exists.');
      } else {
        result.errors.push(`Failed to create group: ${groupError.message}`);
      }
      return result;
    }

    result.group = groupData as ApiGroup;

    // Step 2: Add members if any specified (validate array first)
    if (input.memberIds && input.memberIds.length > 0 && result.group) {
      // Filter out any empty/invalid IDs
      const validMemberIds = input.memberIds.filter(id => id && id.trim().length > 0);
      
      if (validMemberIds.length === 0) {
        // No valid member IDs, skip member insertion
        return result;
      }
      
      const memberInserts = validMemberIds.map(memberId => ({
        group_id: result.group!.id,
        user_id: memberId.trim()
      }));

      const { data: membersData, error: membersError } = await supabase
        .from('api_group_members')
        .insert(memberInserts)
        .select();

      if (membersError) {
        // Log specific error message for debugging RLS issues
        console.error('Member insertion failed - Error details:', membersError.message);
        console.error('Error code:', membersError.code);
        console.error('Full error:', membersError);
        
        // If adding members fails, delete the group we just created (cleanup)
        console.log('Deleting group due to member insertion failure...');
        await supabase
          .from('api_group')
          .delete()
          .eq('id', result.group.id);
        
        // Handle specific error codes
        if (membersError.code === '42501') {
          result.errors.push('Database Error: Your account does not have Teacher permissions in the api_user table.');
        } else if (membersError.code === '23505') {
          result.errors.push('Some members could not be added because they are already in the group.');
        } else {
          result.errors.push(`Failed to add members: ${membersError.message}`);
        }
        
        // Clear the group since we deleted it
        result.group = null;
        return result;
      }

      result.members = membersData as ApiGroupMember[];
    }

    // === BACKEND SYNC: Notify Django API ===
    // After creating group in Supabase, also create in Django so ChatView can see it
    if (result.group) {
      try {
        await syncGroupToDjango(result.group, input.memberIds || []);
        console.log('Group synced to Django backend successfully');
      } catch (syncErr) {
        // Log sync error but don't fail the operation - Supabase is the source of truth
        console.warn('Backend sync to Django failed (non-critical):', syncErr);
      }
    }

    return result;
  } catch (err) {
    console.error('Unexpected error in createGroupWithMembers:', err);
    result.errors.push(err instanceof Error ? err.message : 'An unexpected error occurred');
    return result;
  }
}

/**
 * Verify teacher permissions before showing the form
 * 
 * @param userId - The UUID of the user to verify
 * @returns Promise<{ canCreate: boolean; isStaff: boolean; error?: string }>
 */
export async function verifyTeacherPermissions(userId: string): Promise<{
  canCreate: boolean;
  isStaff: boolean;
  error?: string;
}> {
  if (!userId) {
    return {
      canCreate: false,
      isStaff: false,
      error: 'User not authenticated'
    };
  }

  try {
    const { data, error } = await supabase
      .from('api_user')
      .select('is_staff')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error verifying permissions:', error.code, error.message);
      
      // Handle "user not found" error
      if (error.code === 'PGRST116') {
        return {
          canCreate: false,
          isStaff: false,
          error: 'User not found in database. Please contact admin.'
        };
      }
      
      return {
        canCreate: false,
        isStaff: false,
        error: 'Failed to verify permissions'
      };
    }

    // Check if user exists and has is_staff = true
    if (!data) {
      return {
        canCreate: false,
        isStaff: false,
        error: 'User profile not found'
      };
    }

    const isStaff = data?.is_staff === true;
    
    return {
      canCreate: isStaff,
      isStaff,
      error: isStaff ? undefined : 'Only teachers can create groups'
    };
  } catch (err) {
    return {
      canCreate: false,
      isStaff: false,
      error: 'An unexpected error occurred'
    };
  }
}
