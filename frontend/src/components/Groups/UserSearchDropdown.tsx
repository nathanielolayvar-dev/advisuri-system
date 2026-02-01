import { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, Check, Loader2 } from 'lucide-react';
import api from '../../api';

interface User {
  id: number;
  username: string;
}

interface Props {
  groupId: number;
  currentMembers: number[];
  onMemberAdded: () => void;
}

export const UserSearchDropdown = ({
  groupId,
  currentMembers,
  onMemberAdded,
}: Props) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      api.get(`/api/users/?search=${query}`).then((res) => {
        // We filter locally, but you can also do this in Django
        const filtered = res.data.filter(
          (u: User) => !currentMembers.includes(u.id)
        );
        setResults(filtered);
        setIsOpen(true);
        setLoading(false);
      }).catch(() => setLoading(false));
    }, 300); // Small debounce to save API calls

    return () => clearTimeout(timer);
  }, [query, currentMembers]);

  const handleAdd = async (userId: number) => {
    try {
      await api.patch(`/api/groups/${groupId}/`, {
        members: [...currentMembers, userId],
      });
      setQuery('');
      setIsOpen(false);
      onMemberAdded(); 
    } catch (err) {
      console.error('Failed to add member', err);
    }
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Search Input Container */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          placeholder="Search members..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-10 py-2 bg-slate-100 border border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm outline-none transition-all"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" size={14} />
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
          <ul className="max-h-60 overflow-y-auto">
            {results.map((user) => (
              <li 
                key={user.id} 
                onClick={() => handleAdd(user.id)}
                className="flex items-center justify-between px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0"
              >
                <div className="flex items-center gap-3">
                  {/* Avatar Circle */}
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{user.username}</span>
                </div>
                
                {/* Add Icon */}
                <div className="text-slate-400 hover:text-blue-600 transition-colors">
                  <UserPlus size={18} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};