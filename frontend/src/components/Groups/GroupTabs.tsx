import React from 'react';
import { Users, Plus, Settings, ChevronRight, Search, Loader2 } from 'lucide-react';
import { Group } from '../../shared/types';

interface GroupTabsProps {
  groups: Group[];
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
  onOpenModal: () => void;
  onMemberAdded?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  loading?: boolean;
  isStaff?: boolean;
}

export const GroupTabs = ({
  groups,
  selectedGroupId,
  onSelectGroup,
  onOpenModal,
  searchQuery = '',
  onSearchChange,
  loading = false,
  isStaff = false,
}: GroupTabsProps) => {

  // Helper to safely get an initial
  const getMemberInitial = (member: any) => {
    if (typeof member === 'object' && member.username) {
      return member.username.charAt(0).toUpperCase();
    }
    return '?';
  };

  // Get avatar color based on username hash
  const getAvatarColor = (username: string) => {
    const colors = ['#2563EB', '#7C3AED', '#DB2777', '#059669', '#EA580C', '#0891B2', '#4F46E5'];
    const hash = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <div className="w-80 h-full bg-white border-r border-slate-200 flex flex-col shrink-0">
      {/* HEADER */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-200">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 tracking-tight">Groups</h1>
              <p className="text-xs text-slate-400">{groups.length} workspaces</p>
            </div>
          </div>
          <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        {onSearchChange && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        )}

        {isStaff && (
        <button 
          onClick={onOpenModal} 
          className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-100 transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>New Group</span>
        </button>
        )}
      </div>

      {/* GROUP LIST */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-sm text-slate-400 mb-3">No groups found</p>
            {isStaff && (
            <button
              onClick={onOpenModal}
              className="text-sm text-blue-600 font-medium hover:text-blue-700"
            >
              Create your first group
            </button>
            )}
          </div>
        ) : (
          groups.map((group) => {
            const isActive = selectedGroupId === group.id;
            const memberCount = group.members?.length || 0;
            const displayMembers = group.member_details?.slice(0, 3) || [];

            return (
              <button
                key={group.id}
                onClick={() => onSelectGroup(group.id)}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all relative border ${
                  isActive 
                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-sm' 
                    : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-100'
                }`}
              >
                {/* Group Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0 ${
                  isActive 
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600' 
                    : 'bg-gradient-to-br from-slate-400 to-slate-500'
                }`}>
                  {group.name?.charAt(0).toUpperCase() || 'G'}
                </div>

                {/* Group Info */}
                <div className="flex-1 text-left overflow-hidden">
                  <span className={`text-sm truncate block ${isActive ? 'font-bold text-blue-900' : 'font-semibold text-slate-700'}`}>
                    {group.name}
                  </span>
                  {group.course && (
                    <span className="text-xs text-slate-400 truncate block">{group.course}</span>
                  )}
                  
                  {/* Member avatars */}
                  {memberCount > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex -space-x-2">
                        {displayMembers.map((member, i) => (
                          <div 
                            key={member.id || i}
                            className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[9px] text-white font-bold"
                            style={{ backgroundColor: getAvatarColor(member.username) }}
                          >
                            {getMemberInitial(member)}
                          </div>
                        ))}
                        {memberCount > 3 && (
                          <div className="w-5 h-5 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[9px] text-slate-500 font-bold">
                            +{memberCount - 3}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">{memberCount}</span>
                    </div>
                  )}
                </div>

                {/* Active indicator */}
                {isActive && (
                  <>
                    <ChevronRight className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <div className="absolute left-0 top-3 bottom-3 w-1 bg-blue-500 rounded-r-full" />
                  </>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
