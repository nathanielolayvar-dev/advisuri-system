import React, { useState, useEffect } from 'react';
import { X, Users, Plus, Check, Hash } from 'lucide-react';
import '../../styles/GroupModal.css';
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Users size={18} />
            </div>
            <h2 className="font-bold text-slate-800">Create New Group</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="input-group">
              <label className="input-label">Group Name</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  className="modal-input w-full pl-10"
                  placeholder="e.g. Marketing Team"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  autoFocus
                />
              </div>
              <p className="text-[10px] text-slate-400">
                This will be the channel name for your workspace.
              </p>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !groupName.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md shadow-blue-200"
            >
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
