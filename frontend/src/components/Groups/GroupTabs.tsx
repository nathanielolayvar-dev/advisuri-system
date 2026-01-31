import React from 'react';
import { Hash, Users, Plus, Settings } from 'lucide-react';
import { UserSearchDropdown } from './UserSearchDropdown';
import '../../styles/GroupTabs.css';

interface Group {
  id: number;
  name: string;
  members: number[];
}

interface GroupTabsProps {
  groups: Group[];
  selectedGroupId: number | null;
  onSelectGroup: (groupId: number) => void;
  onOpenModal: () => void; // Added prop to trigger the modal
  onMemberAdded: () => void; // Callback
}

export const GroupTabs = ({
  groups,
  selectedGroupId,
  onSelectGroup,
  onOpenModal,
  onMemberAdded,
}: GroupTabsProps) => {
  const activeGroup = groups.find((group) => group.id === selectedGroupId);

  return (
    <div className="tabs-container">
      <div className="tabs-header">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <Users className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-bold text-slate-800 tracking-tight">
            Workspace
          </h1>
        </div>
        <Settings className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-600" />
      </div>

      <div className="p-4 space-y-4">
        <button onClick={onOpenModal} className="new-group-btn group w-full">
          <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
          <span>New Group</span>
        </button>

        {/* INTEGRATION: Member Search */}
        {selectedGroupId && (
          <div className="mt-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Add Member to #{activeGroup?.name}
            </p>
            <UserSearchDropdown
              groupId={selectedGroupId}
              currentMembers={activeGroup?.members || []}
              onMemberAdded={onMemberAdded}
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4 custom-scrollbar">
        <div className="flex items-center justify-between px-3 mb-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Channels
          </p>
          <span className="text-[10px] font-bold text-slate-300 bg-slate-100 px-1.5 py-0.5 rounded">
            {groups.length}
          </span>
        </div>

        <div className="space-y-1">
          {groups.map((group) => {
            const isActive = selectedGroupId === group.id;
            return (
              <button
                key={group.id}
                onClick={() => onSelectGroup(group.id)}
                className={`group-item ${isActive ? 'active' : 'inactive'}`}
              >
                <Hash
                  className={`w-4 h-4 ${isActive ? 'text-white/80' : 'text-slate-400'}`}
                />
                <span
                  className={`text-sm truncate ${isActive ? 'font-bold' : 'font-medium'}`}
                >
                  {group.name}
                </span>
                {isActive && <div className="status-dot" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
