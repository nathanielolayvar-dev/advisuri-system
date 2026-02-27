/**
 * MemberManager Component - Dropdown to add students to groups (Teacher only)
 *
 * Uses the `users` Supabase table (non-prefixed) and `group_members` junction table.
 * Column mapping:
 *   users.user_id   → unique identifier
 *   users.full_name → display name
 *   users.role      → 'admin' | 'teacher' | 'student'
 *
 * Security Logic:
 * - Teachers/Admins (isStaff === true): can see and use this component
 * - Students (isStaff === false): component is not rendered
 *
 * Usage:
 * <MemberManager
 *   groupId="uuid-of-group"
 *   currentMembers={[{id: "uuid", username: "John Doe"}]}
 *   isStaff={true}
 *   onMemberAdded={() => refreshGroups()}
 * />
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, UserPlus, Loader2, X, Users } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { SupabaseUser, SupabaseGroupMember } from '../../shared/types';

interface MemberManagerProps {
  /** The UUID of the group to add members to */
  groupId: string;
  /** Current members of the group (to exclude from selection) */
  currentMembers: Array<{ id: string; username: string }>;
  /** Whether the current user is a staff member (teacher or admin) */
  isStaff: boolean;
  /** Callback when a member is successfully added */
  onMemberAdded?: (member: SupabaseGroupMember) => void;
  /** Optional: Custom className for styling */
  className?: string;
  /** Placeholder text for the search input */
  placeholder?: string;
}

export const MemberManager: React.FC<MemberManagerProps> = ({
  groupId,
  currentMembers,
  isStaff,
  onMemberAdded,
  className = '',
  placeholder = 'Search students to add...'
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SupabaseUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Only render for staff members
  if (!isStaff) {
    return null;
  }

  // Get current member IDs for filtering
  const currentMemberIds = currentMembers.map(m => m.id);

  // Search for users
  const searchUsers = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 1) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch all students from the `users` table
      const { data, error: searchError } = await supabase
        .from('users')
        .select('user_id, full_name, email, role, is_active, created_at, profile_picture_url')
        .eq('role', 'student')
        .order('full_name', { ascending: true })
        .limit(20);

      if (searchError) {
        console.error('Error searching users:', searchError);
        setError('Failed to search users');
        setLoading(false);
        return;
      }

      // Filter by query and exclude current members
      const filtered = (data || [])
        .filter((user: SupabaseUser) => {
          // Exclude already added members
          if (currentMemberIds.includes(user.user_id)) return false;

          // Filter by search query
          const searchLower = searchQuery.toLowerCase();
          return (
            user.full_name?.toLowerCase().includes(searchLower) ||
            user.email?.toLowerCase().includes(searchLower)
          );
        })
        .slice(0, 10);

      setResults(filtered);
      setIsOpen(true);
    } catch (err) {
      console.error('Unexpected error searching users:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [currentMemberIds]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 1) {
        searchUsers(query);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, searchUsers]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Add a member to the group
  const handleAddMember = async (user: SupabaseUser) => {
    setAddingId(user.user_id);
    setError(null);

    try {
      const { data, error: addError } = await supabase
        .from('group_members')
        .insert([{
          group_id: groupId,
          user_id: user.user_id
        }])
        .select()
        .single();

      if (addError) {
        console.error('Error adding member:', addError);

        // Handle specific error codes
        if (addError.code === '23505') {
          alert(`Error: ${user.full_name} is already a member of this group.`);
          setError('User is already a member of this group.');
        } else if (addError.code === '42501') {
          alert('Permission Denied: Only teachers can add members to groups.');
          setError('Permission Denied');
        } else {
          alert(`Failed to add member: ${addError.message}`);
          setError(addError.message);
        }
        setLoading(false);
        return;
      }

      if (data) {
        const newMember = data as SupabaseGroupMember;
        // Remove from results
        setResults(prev => prev.filter(r => r.user_id !== user.user_id));
        setQuery('');
        setIsOpen(false);
        onMemberAdded?.(newMember);
      }
    } catch (err) {
      console.error('Unexpected error adding member:', err);
      alert('An unexpected error occurred');
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className={`relative w-full ${className}`} ref={dropdownRef}>
      {/* Search Input Container */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => query.length >= 1 && setIsOpen(true)}
          className="w-full pl-10 pr-10 py-2.5 bg-slate-100 border border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm outline-none transition-all"
          disabled={addingId !== null}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" size={16} />
        )}
        {!loading && query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
          <ul className="max-h-60 overflow-y-auto">
            {results.map((user) => {
              const isAdding = addingId === user.user_id;

              return (
                <li
                  key={user.user_id}
                  onClick={() => !isAdding && handleAddMember(user)}
                  className={`flex items-center justify-between px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0 ${isAdding ? 'opacity-50 cursor-wait' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar Circle */}
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-white flex items-center justify-center font-bold text-xs">
                      {user.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{user.full_name}</p>
                      <p className="text-xs text-slate-400">{user.email}</p>
                    </div>
                  </div>
                  
                  {/* Add Icon */}
                  <div className="text-slate-400">
                    {isAdding ? (
                      <Loader2 size={18} className="animate-spin text-blue-500" />
                    ) : (
                      <UserPlus size={18} className="hover:text-blue-600 transition-colors" />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Empty State */}
      {isOpen && query.length >= 1 && results.length === 0 && !loading && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-4 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="text-center text-slate-400">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No students found</p>
            <p className="text-xs text-slate-300 mt-1">Try a different search term</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
          {error}
        </div>
      )}
    </div>
  );
};

export default MemberManager;
