import React, { useState, useEffect } from 'react';
import { Video, MessageSquare, FileText, Clock, Users } from 'lucide-react';
import { GroupTabs } from './GroupTabs';
import { GroupModal } from './GroupModals';
import { UserSearchDropdown } from './UserSearchDropdown';
import { ChatView } from './views/ChatView';
import { NotesView } from './views/NotesView';
import { TimelineView } from './views/TimelineView';
import api from '../../api';

type ViewType = 'chat' | 'notes' | 'timeline';

// Internal Component for the Awesome Avatar Stack
const MemberStack = ({ members }: { members: any[] }) => {
  const displayLimit = 3;
  const displayMembers = members.slice(0, displayLimit);
  const extra = members.length - displayLimit;

  return (
    <div className="flex items-center -space-x-2 ml-2">
      {displayMembers.map((m, i) => (
        <div 
          key={m.id} 
          title={m.username}
          className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-1 ring-slate-200
            ${['bg-blue-500', 'bg-purple-500', 'bg-emerald-500'][i % 3]}`}
        >
          {m.username.charAt(0).toUpperCase()}
        </div>
      ))}
      {extra > 0 && (
        <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm ring-1 ring-slate-200">
          +{extra}
        </div>
      )}
    </div>
  );
};

export const Groups = () => {
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<ViewType>('chat');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchGroups = async () => {
    try {
      const res = await api.get('/api/groups/');
      setGroups(res.data);
      if (res.data.length > 0 && !selectedGroupId) {
        setSelectedGroupId(res.data[0].id);
      }
    } catch (err) {
      console.error('Error loading groups:', err);
    }
  };

  useEffect(() => { fetchGroups(); }, []);

  const activeGroup = groups.find((g) => g.id === selectedGroupId);

  const handleGroupCreated = (newGroup: any) => {
    setGroups((prev) => [...prev, newGroup]);
    setSelectedGroupId(newGroup.id);
    setIsModalOpen(false);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* SIDEBAR: Group Navigation */}
      <GroupTabs
        groups={groups}
        selectedGroupId={selectedGroupId}
        onSelectGroup={setSelectedGroupId}
        onOpenModal={() => setIsModalOpen(true)}
        onMemberAdded={fetchGroups}
      />

      {/* MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedGroupId ? (
          <>
            {/* AWESOME HEADER */}
            <div className="bg-white border-b border-slate-200 px-8 pt-8 shrink-0">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-slate-900">{activeGroup?.name}</h2>
                    <MemberStack members={activeGroup?.member_details || []} />
                  </div>
                  <p className="text-slate-500 mt-1">{activeGroup?.course || 'General Study'}</p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-64">
                    <UserSearchDropdown
                      groupId={selectedGroupId}
                      currentMembers={activeGroup?.members || []}
                      onMemberAdded={fetchGroups}
                    />
                  </div>
                  <button className="flex items-center gap-2 bg-[#10b981] hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-100 transition-all active:scale-95">
                    <Video size={18} />
                    Join Video Call
                  </button>
                </div>
              </div>

              {/* TAB NAVIGATION */}
              <div className="flex gap-8">
                {(['chat', 'notes', 'timeline'] as ViewType[]).map((view) => (
                  <button
                    key={view}
                    onClick={() => setActiveView(view)}
                    className={`pb-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2 -mb-[1px] ${
                      activeView === view
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {view === 'chat' ? 'Chat & Documents' : view}
                  </button>
                ))}
              </div>
            </div>

            {/* DYNAMIC CONTENT AREA */}
            <div className="flex-1 overflow-hidden p-6">
              <div className="h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {activeView === 'chat' && <ChatView groupId={selectedGroupId} />}
                {activeView === 'notes' && <NotesView groupId={selectedGroupId} />}
                {activeView === 'timeline' && <TimelineView groupId={selectedGroupId} />}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
             <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-2xl">📁</div>
             <p className="font-medium font-sans">Select a group to start collaborating</p>
          </div>
        )}
      </div>

      <GroupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGroupCreated={handleGroupCreated}
      />
    </div>
  );
};