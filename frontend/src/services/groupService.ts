import { supabase } from '../supabaseClient';
import { ApiGroup, ApiGroupMember } from '../shared/types';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ServiceResult<T> {
  data: T | null;
  error: Error | null;
}

export interface GroupWithMembers {
  id: string;
  name: string;
  course: string;
  created_at: string;
  member_details: Array<{ 
    id: string; 
    username: string; 
    email: string;
  }>;
  members: string[]; // Array of UUIDs
  member_count: number;
}

export interface CreateGroupWithMembersInput {
  name: string;
  course?: string;
  memberIds: string[];
}

export interface CreateGroupWithMembersResult {
  group: any | null;
  members: any[];
  errors: string[];
}

// ============================================================================
// Core Service Functions
// ============================================================================

/**
 * Fetch all groups and their members
 * Joins groups -> group_members -> users
 */
export async function getGroups(): Promise<ServiceResult<GroupWithMembers[]>> {
  try {
    const { data, error } = await supabase
      .from('groups')
      .select(`
        group_id,
        group_name,
        course,
        created_at,
        group_members (
          user_id,
          users (
            user_id,
            full_name,
            email
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const transformed: GroupWithMembers[] = (data || []).map((group: any) => ({
      id: group.group_id,
      name: group.group_name,
      course: group.course || '',
      created_at: group.created_at,
      member_details: group.group_members?.map((m: any) => ({
        id: m.users?.user_id || m.user_id,
        username: m.users?.full_name || 'User',
        email: m.users?.email || ''
      })) || [],
      members: group.group_members?.map((m: any) => m.user_id) || [],
      member_count: group.group_members?.length || 0
    }));

    return { data: transformed, error: null };
  } catch (err: any) {
    console.error('getGroups Error:', err);
    return { data: null, error: err };
  }
}

/**
 * Create a group and add initial members in one flow
 * @param isAdmin - Boolean from your SidebarContext/Auth state
 */
export async function createGroupWithMembers(
  input: CreateGroupWithMembersInput,
  userId: string,
  isAdmin: boolean
): Promise<CreateGroupWithMembersResult> {
  const result: CreateGroupWithMembersResult = { group: null, members: [], errors: [] };

  if (!isAdmin) {
    result.errors.push('Permission Denied: Only teachers can create groups.');
    return result;
  }

  try {
    // 1. Create the Group
    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .insert([{ 
        group_name: input.name, 
        course: input.course || '',
        created_by: userId 
      }])
      .select()
      .single();

    if (groupError) {
      result.errors.push(`Group creation failed: ${groupError.message}`);
      return result;
    }

    result.group = groupData;

    // 2. Add Members (including the creator)
    const allMembers = Array.from(new Set([...input.memberIds, userId]));
    const memberInserts = allMembers.map(mId => ({
      group_id: groupData.group_id,
      user_id: mId
    }));

    const { data: membersData, error: membersError } = await supabase
      .from('group_members')
      .insert(memberInserts)
      .select();

    if (membersError) {
      result.errors.push(`Members could not be added: ${membersError.message}`);
    } else {
      result.members = membersData;
    }

    return result;
  } catch (err: any) {
    result.errors.push(err.message);
    return result;
  }
}

/**
 * Add a single member to an existing group
 */
export async function addMemberToGroup(
  groupId: string,
  targetUserId: string,
  isAdmin: boolean
): Promise<ServiceResult<any>> {
  if (!isAdmin) {
    return { data: null, error: new Error('Unauthorized') };
  }

  try {
    const { data, error } = await supabase
      .from('group_members')
      .insert([{ group_id: groupId, user_id: targetUserId }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new Error('User is already in this group');
      throw error;
    }

    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

/**
 * Delete a group (Only the creator or an admin)
 */
export async function deleteGroup(
  groupId: string,
  isAdmin: boolean
): Promise<ServiceResult<void>> {
  if (!isAdmin) {
    return { data: null, error: new Error('Only teachers can delete groups') };
  }

  try {
    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('group_id', groupId);

    if (error) throw error;
    return { data: null, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}