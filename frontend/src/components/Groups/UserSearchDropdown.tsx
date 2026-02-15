/**
 * UserSearchDropdown - Search and add members to groups
 * 
 * Fixed: Maximum update depth exceeded error
 * - Use useMemo for derived state
 * - Add proper guards in useEffect
 * - Use useCallback for handlers
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, UserPlus, Loader2, Users } from 'lucide-react';
import { supabase } from '../../supabaseClient';

interface User {
  id: string;
  username: string;
  first_name?: string;
  last_name?: string;
}

interface Props {
  groupId: string | number;
  currentMembers: (string | number)[];
  onMemberAdded: () => void;
  isStaff?: boolean;
}

export const UserSearchDropdown = ({
  groupId,
  currentMembers,
  onMemberAdded,
  isStaff = true
}: Props) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use useMemo to prevent recalculation on every render
  const currentMemberIds = useMemo(() => {
    return new Set(currentMembers.map(m => String(m)));
  }, [currentMembers]);

  // Use ref to store currentMemberIds to avoid infinite loop in useEffect
  const currentMemberIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    currentMemberIdsRef.current = currentMemberIds;
  }, [currentMemberIds]);

  // Only render for staff/teachers
  if (!isStaff) {
    return null;
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      // Clear timeout on cleanup
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Search users from Supabase - wrapped in useCallback with ref to prevent infinite loops
  const searchUsers = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 1) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Search for students (non-staff users)
      const { data, error: searchError } = await supabase
        .from('api_user')
        .select('id, username, first_name, last_name')
        .eq('is_staff', false)
        .or(`username.ilike.%${searchQuery}%,first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`)
        .order('username', { ascending: true })
        .limit(10);

      if (searchError) {
        console.error('Error searching users:', searchError);
        setLoading(false);
        return;
      }

      // Filter out already added members using ref (stable reference)
      const filtered = (data || []).filter(
        (u: User) => !currentMemberIdsRef.current.has(String(u.id))
      );
      
      setResults(filtered);
      setIsOpen(true);
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Search effect with debounce - only depends on query, not searchUsers
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Don't search if query is empty
    if (!query || query.length < 1) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    // Debounce the search
    searchTimeoutRef.current = setTimeout(() => {
      searchUsers(query);
    }, 300);

    // Cleanup function
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, searchUsers]);

  // Handle adding a member
  const handleAdd = useCallback(async (userId: string) => {
    setAddingId(userId);
    setError(null);

    try {
      const { data, error: addError } = await supabase
        .from('api_group_members')
        .insert([{ 
          group_id: String(groupId), 
          user_id: userId 
        }])
        .select()
        .single();

      if (addError) {
        console.error('Error adding member:', addError);
        
        if (addError.code === '23505') {
          alert('This user is already a member of the group.');
          setError('User is already a member');
        } else if (addError.code === '42501') {
          alert('Permission Denied: Only teachers can add members.');
          setError('Permission denied');
        } else {
          alert(`Failed to add member: ${addError.message}`);
          setError(addError.message);
        }
        setLoading(false);
        return;
      }

      if (data) {
        setQuery('');
        setIsOpen(false);
        onMemberAdded();
      }
    } catch (err) {
      console.error('Unexpected error adding member:', err);
      alert('An unexpected error occurred');
    } finally {
      setAddingId(null);
    }
  }, [groupId, onMemberAdded]);

  // Handle input change
  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  // Handle dropdown toggle
  const toggleDropdown = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  // Clear query
  const clearQuery = useCallback(() => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Search Input Container */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          placeholder="Search students to add..."
          value={query}
          onChange={handleQueryChange}
          onFocus={() => query.length >= 1 && setIsOpen(true)}
          className="w-full pl-10 pr-10 py-2 bg-slate-100 border border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm outline-none transition-all"
          disabled={addingId !== null}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" size={14} />
        )}
        {!loading && query && (
          <button
            onClick={clearQuery}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <span className="text-lg">&times;</span>
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
          <ul className="max-h-60 overflow-y-auto">
            {results.map((user) => {
              const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username;
              const isAdding = addingId === user.id;
              
              return (
                <li 
                  key={user.id} 
                  onClick={() => !isAdding && handleAdd(user.id)}
                  className={`flex items-center justify-between px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0 ${isAdding ? 'opacity-50 cursor-wait' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-slate-700 block">{fullName}</span>
                      <span className="text-xs text-slate-400">@{user.username}</span>
                    </div>
                  </div>
                  
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
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-4">
          <div className="text-center text-slate-400">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No students found</p>
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

export default UserSearchDropdown;
