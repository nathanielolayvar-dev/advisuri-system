import React, { useState, useEffect } from 'react';
import { X, Users, Plus, Check } from 'lucide-react';
import api from '../../api';

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (newGroup: any) => void;
}

export const GroupModal = ({
  isOpen,
  onClose,
  onGroupCreated,
}: GroupModalProps) => {
  const [groupName, setGroupName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]); // To hold list of potential members
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);

  // Fetch users when modal opens
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // This hits your Django User list endpoint
        const response = await api.get('/api/users/');
        setUsers(response.data);
      } catch (err) {
        console.error('Error fetching users for group creation:', err);
      }
    };

    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]); // Only runs when the modal opens or closes

  if (!isOpen) return null;

  const toggleMember = (id: number) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((mid) => mid !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    setLoading(true); // Fixed the 'True' typo
    try {
      // Send both the name and the array of member IDs
      const response = await api.post('/api/groups/', {
        name: groupName,
        member_ids: selectedMemberIds,
      });
      onGroupCreated(response.data);
      setGroupName('');
      setSelectedMemberIds([]);
      onClose();
    } catch (err) {
      console.error('Failed to create group:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter users based on the search input
  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-slate-800">New Group</h2>
            <p className="text-xs text-slate-500">
              Organize your team and discussions
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="p-6 space-y-6 overflow-y-auto">
            {/* Group Name Input */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">
                Group Name
              </label>
              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                placeholder="Marketing Team..."
              />
            </div>

            {/* Member Selection List */}
            <div className="flex flex-col flex-1">
              <div className="flex justify-between items-end mb-2 px-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  Select Members
                </label>
                <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {selectedMemberIds.length} Selected
                </span>
              </div>

              {/* SEARCH BAR */}
              <div className="relative mb-3">
                <input
                  type="text"
                  placeholder="Search by name or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-2.5 pl-9 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>

              <div className="mt-1 space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => toggleMember(user.id)}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all duration-200 ${
                      selectedMemberIds.includes(user.id)
                        ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                        : 'border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                          user.role === 'teacher'
                            ? 'bg-indigo-500'
                            : 'bg-slate-400'
                        }`}
                      >
                        {user.username.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span
                          className={`text-sm font-semibold ${selectedMemberIds.includes(user.id) ? 'text-blue-700' : 'text-slate-700'}`}
                        >
                          {user.username}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                          {user.role}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                        selectedMemberIds.includes(user.id)
                          ? 'bg-blue-600 border-blue-600 scale-110'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {selectedMemberIds.includes(user.id) && (
                        <Check className="w-3 h-3 text-white stroke-[3]" />
                      )}
                    </div>
                  </div>
                ))}

                {filteredUsers.length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-sm italic">
                    {searchTerm
                      ? `No users matching "${searchTerm}"`
                      : 'No users found.'}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 border-t bg-slate-50/50">
            <button
              type="submit"
              disabled={loading || !groupName.trim()}
              className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/25 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Create Group'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
