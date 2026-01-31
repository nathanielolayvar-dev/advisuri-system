//This is the "parent" container

import React, { useState, useEffect } from 'react';
import { GroupTabs } from './GroupTabs';
import { GroupModal } from './GroupModals';
import { UserSearchDropdown } from './UserSearchDropdown';
import { ChatView } from './views/ChatView';
import { NotesView } from './views/NotesView';
import { TimelineView } from './views/TimelineView';
import api from '../../api';

//Defined our view types for type safety
type ViewType = 'chat' | 'notes' | 'timeline';

export const Groups = () => {
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<ViewType>('chat');
  const [isModalOpen, setIsModalOpen] = useState(false);

  //Fetch all groups the user belongs to on mount
  const fetchGroups = async () => {
    try {
      const res = await api.get('/api/groups/');
      setGroups(res.data);
      // Auto-select the first group if nothing is selected
      if (res.data.length > 0 && !selectedGroupId) {
        setSelectedGroupId(res.data[0].id);
      }
    } catch (err) {
      console.error('Error loading groups:', err);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  //Logic to add a new group
  const handleGroupCreated = (newGroup: any) => {
    setGroups((prevGroups) => [...prevGroups, newGroup]); //Add the real group (with real ID from Django) to the state
    setSelectedGroupId(newGroup.id); //Automatically switch to the newly created group
    // Note: Modal state is handled by the close button or handled here if preferred
  };

  const handleAddMember = async (userId: number) => {
    try {
      const currentGroup = groups.find((g) => g.id === selectedGroupId);
      if (!currentGroup) {
        console.error('Group not found');
        return;
      }
      // 1. Combine existing members with the new user ID
      const updatedMembers = [...currentGroup.members, userId];

      // 2. Send only the updated 'members' field to the backend
      await api.patch(`/api/groups/${currentGroup.id}/`, {
        members: updatedMembers,
      });

      // 3. Refresh the UI to reflect the new member count/list
      fetchGroups();
    } catch (err) {
      console.error('Failed to add member:', err);
    }
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* SIDEBAR: Group Navigation */}
      <GroupTabs
        groups={groups}
        selectedGroupId={selectedGroupId}
        onSelectGroup={setSelectedGroupId}
        onOpenModal={() => setIsModalOpen(true)}
        onMemberAdded={fetchGroups}
      />

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
        {selectedGroupId ? (
          <>
            {/* VIEW SWITCHER HEADER */}
            <div className="h-16 bg-white border-b border-slate-200 px-8 flex gap-8 shrink-0">
              {(['chat', 'notes', 'timeline'] as ViewType[]).map((view) => (
                <button
                  key={view}
                  onClick={() => setActiveView(view)}
                  className={`h-full text-xs font-bold uppercase tracking-widest transition-all border-b-2 -mb-[1px] ${
                    activeView === view
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {view}
                </button>
              ))}
            </div>

            {/* DYNAMIC VIEW RENDERING */}
            <div className="flex-1 overflow-hidden">
              {activeView === 'chat' && selectedGroupId && (
                <ChatView groupId={selectedGroupId} />
              )}
              {activeView === 'notes' && selectedGroupId && (
                <NotesView groupId={selectedGroupId} />
              )}
              {activeView === 'timeline' && selectedGroupId && (
                <TimelineView groupId={selectedGroupId} />
              )}
            </div>
          </>
        ) : (
          /* EMPTY STATE */
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-2">
              <span className="text-xl">📁</span>
            </div>
            <p className="font-medium">
              Select a group to view conversation and tasks
            </p>
          </div>
        )}
      </div>

      {/* MODAL: Create New Group */}
      <GroupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGroupCreated={handleGroupCreated}
      />
    </div>
  );
};
