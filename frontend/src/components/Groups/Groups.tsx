import React, { useState, useEffect } from 'react';
import { Video, MessageSquare, FileText, Clock, Users, Search, MoreHorizontal } from 'lucide-react';
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
  const displayLimit = 4;
  const displayMembers = members.slice(0, displayLimit);
  const extra = members.length - displayLimit;

  return (
    <div className="flex items-center -space-x-2 ml-3">
      {displayMembers.map((m, i) => (
        <div 
          key={m.id || i} 
          title={m.username}
          className={`w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-1 ring-slate-200
            ${['bg-gradient-to-br from-blue-500 to-blue-700', 'bg-gradient-to-br from-purple-500 to-purple-700', 'bg-gradient-to-br from-emerald-500 to-emerald-700', 'bg-gradient-to-br from-amber-500 to-amber-700'][i % 4]}`
        }
        >
          {m.username?.charAt(0).toUpperCase() || '?'}
        </div>
      ))}
      {extra > 0 && (
        <div className="w-7 h-7 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm ring-1 ring-slate-200">
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
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/groups/');
      setGroups(res.data);
      if (res.data.length > 0 && !selectedGroupId) {
        setSelectedGroupId(res.data[0].id);
      }
    } catch (err) {
      console.error('Error loading groups:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGroups(); }, []);

  const activeGroup = groups.find((g) => g.id === selectedGroupId);

  const handleGroupCreated = (newGroup: any) => {
    setGroups((prev) => [...prev, newGroup]);
    setSelectedGroupId(newGroup.id);
    setIsModalOpen(false);
  };

  // Filter groups based on search
  const filteredGroups = groups.filter(g => 
    g.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.course?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden font-sans">
      {/* SIDEBAR: Group Navigation */}
      <GroupTabs
        groups={filteredGroups}
        selectedGroupId={selectedGroupId}
        onSelectGroup={setSelectedGroupId}
        onOpenModal={() => setIsModalOpen(true)}
        onMemberAdded={fetchGroups}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        loading={loading}
      />

      {/* MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedGroupId ? (
          <>
            {/* AWESOME HEADER */}
            <div className="bg-white border-b border-slate-200 px-8 pt-6 pb-4 shrink-0">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-200">
                    {activeGroup?.name?.charAt(0).toUpperCase() || 'G'}
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold text-slate-900">{activeGroup?.name}</h2>
                      <MemberStack members={activeGroup?.member_details || []} />
                    </div>
                    <p className="text-slate-500 text-sm flex items-center gap-2">
                      {activeGroup?.course || 'General Study'}
                      <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                      {activeGroup?.member_details?.length || 0} members
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <UserSearchDropdown
                    groupId={selectedGroupId}
                    currentMembers={activeGroup?.members || []}
                    onMemberAdded={fetchGroups}
                  />
                  <button className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-4 py-2.5 rounded-xl font-semibold shadow-lg shadow-emerald-100 transition-all active:scale-95">
                    <Video size={18} />
                    Join Call
                  </button>
                  <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                    <MoreHorizontal size={20} />
                  </button>
                </div>
              </div>

              {/* TAB NAVIGATION */}
              <div className="flex gap-6 mt-6 -mb-px">
                {[
                  { id: 'chat', icon: MessageSquare, label: 'Chat & Docs' },
                  { id: 'notes', icon: FileText, label: 'Notes' },
                  { id: 'timeline', icon: Clock, label: 'Timeline' },
                ].map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => setActiveView(id as ViewType)}
                    className={`flex items-center gap-2 pb-3 text-sm font-medium transition-all border-b-2 ${
                      activeView === id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Icon size={16} />
                    {label}
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
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4 p-8">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-4xl shadow-inner">
              📁
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-slate-600 mb-2">
                {loading ? 'Loading groups...' : 'No groups yet'}
              </h3>
              <p className="text-sm max-w-md">
                {loading ? 'Please wait while we fetch your workspaces' : 'Create a new group to start collaborating with your team'}
              </p>
            </div>
            {!loading && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-blue-100 transition-all active:scale-95"
              >
                Create Your First Group
              </button>
            )}
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
