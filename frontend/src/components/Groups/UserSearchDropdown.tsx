import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, UserPlus, Loader2, Users } from 'lucide-react';
import { supabase } from '../../supabaseClient';

interface User {
  user_id: string;
  full_name: string;
  email?: string;
}

interface Props {
  groupId: string;
  currentMembers: string[];
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

  const currentMemberIds = useMemo(() => new Set(currentMembers.map(String)), [currentMembers]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const searchUsers = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      // Query the 'users' table using user_id (UUID) as primary key
      const { data, error: searchError } = await supabase
        .from('users')
        .select('user_id, full_name, email')
        .eq('role', 'student')
        .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(8);

      if (searchError) throw searchError;

      // Filter out already added members
      const formatted = (data || []).map((u: any) => ({
        user_id: u.user_id,
        full_name: u.full_name,
        email: u.email
      })).filter(u => !currentMemberIds.has(u.user_id));

      setResults(formatted);
      setIsOpen(true);
    } catch (err: any) {
      console.error('Search error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [currentMemberIds]);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    if (query.trim().length > 0) {
      searchTimeoutRef.current = setTimeout(() => searchUsers(query), 300);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [query, searchUsers]);

  const handleAdd = async (userId: string) => {
    setAddingId(userId);
    setError(null);

    try {
      const { error: addError } = await supabase
        .from('group_members')
        .insert([{
          group_id: groupId,
          user_id: userId
        }]);

      if (addError) throw addError;

      setQuery('');
      setIsOpen(false);
      onMemberAdded(); // This triggers the fetchGroups in the parent
    } catch (err: any) {
      setError(err.message || 'Failed to add member');
    } finally {
      setAddingId(null);
    }
  };

  if (!isStaff) return null;

  return (
    <div className="relative w-64" ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
        <input
          type="text"
          placeholder="Add student..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" size={14} />}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden">
          {results.map((user) => (
            <button
              key={user.user_id}
              onClick={() => handleAdd(user.user_id)}
              disabled={addingId === user.user_id}
              className="w-full flex items-center justify-between px-4 py-2 hover:bg-slate-50 text-left transition-colors"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-700">{user.full_name}</span>
                <span className="text-xs text-slate-400">{user.email}</span>
              </div>
              {addingId === user.user_id ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};