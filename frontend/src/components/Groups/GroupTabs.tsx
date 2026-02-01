import React from 'react';
import { Users, Plus, Settings, ChevronRight } from 'lucide-react';

interface Group {
  id: number;
  name: string;
  course?: string;
  members: any[]; // 'any' ensures we don't crash if backend sends IDs vs Objects
}

interface GroupTabsProps {
  groups: Group[];
  selectedGroupId: number | null;
  onSelectGroup: (groupId: number) => void;
  onOpenModal: () => void;
  onMemberAdded?: () => void;
}

export const GroupTabs = ({
  groups,
  selectedGroupId,
  onSelectGroup,
  onOpenModal,
}: GroupTabsProps) => {

  // Helper to safely get an initial or a dot
  const getMemberInitial = (member: any) => {
    if (typeof member === 'object' && member.username) {
      return member.username.charAt(0).toUpperCase();
    }
    return ''; // Return empty for ID-only data, we'll just show a colored circle
  };

  return (
    <div className="w-80 h-full bg-white border-r border-slate-200 flex flex-col shrink-0">
      {/* HEADER */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-200">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Groups</h1>
          </div>
          <Settings className="w-5 h-5 text-slate-400 cursor-pointer hover:text-slate-600 transition-colors" />
        </div>

        <button 
          onClick={onOpenModal} 
          className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-white hover:border-blue-500 hover:text-blue-600 transition-all group shadow-sm"
        >
          <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
          <span>New Group</span>
        </button>
      </div>

      {/* GROUP LIST */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2">
        <div className="flex items-center justify-between px-2 mb-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Your Workspaces</p>
          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{groups.length}</span>
        </div>

        {groups.map((group) => {
          const isActive = selectedGroupId === group.id;
          const memberCount = group.members?.length || 0;
          const displayMembers = group.members?.slice(0, 3) || [];

          return (
            <button
              key={group.id}
              onClick={() => onSelectGroup(group.id)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all relative border ${
                isActive 
                  ? 'bg-blue-50 border-blue-200 shadow-sm' 
                  : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-100'
              }`}
            >
              <div className="flex flex-col items-start gap-2 overflow-hidden">
                <span className={`text-sm truncate w-full text-left ${isActive ? 'font-bold text-blue-900' : 'font-semibold text-slate-700'}`}>
                  {group.name}
                </span>
                
                {/* INLINE AVATAR STACK */}
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {displayMembers.map((member, i) => (
                      <div 
                        key={i}
                        className="w-6 h-6 rounded-full border-2 border-white bg-blue-500 flex items-center justify-center text-[10px] text-white font-bold"
                      >
                        {getMemberInitial(member)}
                      </div>
                    ))}
                    {memberCount > 3 && (
                      <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] text-slate-500 font-bold">
                        +{memberCount - 3}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">{memberCount} participants</span>
                </div>
              </div>
              
              {isActive && <ChevronRight className="w-4 h-4 text-blue-500" />}
              {isActive && (
                <div className="absolute left-0 top-4 bottom-4 w-1 bg-blue-600 rounded-r-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};