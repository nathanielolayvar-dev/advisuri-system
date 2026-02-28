import React, { useState, useEffect } from 'react';
import { Video, MessageSquare, FileText, Clock, Users, MoreHorizontal } from 'lucide-react';
import { GroupTabs } from './GroupTabs';
import { GroupCreator } from '../GroupCreator/GroupCreator';
import { UserSearchDropdown } from './UserSearchDropdown';
import { ChatView } from './views/ChatView';
import { TasksView } from './views/TasksView';
import { TimelineView } from './views/TimelineView';
import { VideoCall } from './views/VideoCall';
import { useSidebar } from '../Sidebar/SidebarContext';
import { supabase } from '../../supabaseClient';

type ViewType = 'chat' | 'tasks' | 'timeline';

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
            ${['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500'][i % 4]}`
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
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ViewType>('chat');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCall, setShowCall] = useState(false);
  
  const { userData } = useSidebar();
  const isStaff = userData?.isStaff === true;

  const fetchGroups = async () => {
    if (!userData?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('groups')
        .select(`
          group_id,
          group_name,
          course,
          created_at,
          group_members (
            user_id,
            users (
              full_name,
              email
            )
          )
        `);

      if (error) throw error;

      // Transform the data for your UI components
      const transformed = (data || []).map((g: any) => ({
        id: g.group_id,
        name: g.group_name,
        course: g.course,
        created_by: g.created_by,
        members: g.group_members?.map((mem: any) => mem.user_id) || [],
        member_details: g.group_members?.map((mem: any) => ({
          id: mem.user_id,
          username: mem.users?.full_name || mem.users?.username || 'Unknown'
        })) || []
      }));

      setGroups(transformed);

      // Auto-select the first group if nothing is selected yet
      if (transformed.length > 0 && !selectedGroupId) {
        setSelectedGroupId(transformed[0].id);
      }
    } catch (err) {
      console.error("Error fetching groups:", err);
    } finally {
      setLoading(false);
    }
  };

  //fetch whenever the user logs in or ID becomes available
  useEffect(() => {
    if (userData?.id) {
      fetchGroups();
    }
  }, [userData?.id]);

  const activeGroup = groups.find((g) => g.id === selectedGroupId);

  const handleGroupCreated = async () => {
    await fetchGroups(); // Refresh everything
    setIsModalOpen(false);
  };

  const filteredGroups = groups.filter(g => {
    const nameMatch = g.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const courseMatch = g.course?.toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || courseMatch;
  });

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden font-sans">
      <GroupTabs
        groups={filteredGroups}
        selectedGroupId={selectedGroupId}
        onSelectGroup={setSelectedGroupId}
        onOpenModal={() => setIsModalOpen(true)}
        onMemberAdded={fetchGroups}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        loading={loading}
        isStaff={isStaff}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {selectedGroupId ? (
          <>
            <div className="bg-white border-b border-slate-200 px-8 pt-6 pb-4 shrink-0">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
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
                  {isStaff && (
                    <UserSearchDropdown
                      groupId={String(selectedGroupId)}
                      currentMembers={activeGroup?.members || []}
                      onMemberAdded={fetchGroups}
                      isStaff={isStaff}
                    />
                  )}
                  <button 
                    className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-semibold shadow-md transition-all"
                    onClick={() => setShowCall(true)}
                  >
                    <Video size={18} />
                    Join Call
                  </button>
                  <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl">
                    <MoreHorizontal size={20} />
                  </button>
                </div>
              </div>

              <div className="flex gap-6 mt-6 -mb-px">
                {([
                  { id: 'chat', icon: MessageSquare, label: 'Chat & Docs' },
                  { id: 'tasks', icon: FileText, label: 'Tasks' },
                  { id: 'timeline', icon: Clock, label: 'Timeline' },
                ]).map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => setActiveView(id as ViewType)}
                    className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-all ${
                      activeView === id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-hidden p-6">
              <div className="h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {activeView === 'chat' && <ChatView groupId={selectedGroupId} />}
                {activeView === 'tasks' && <TasksView groupId={selectedGroupId} isStaff={isStaff} userId={userData?.id} />}
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
                {loading ? 'Fetching workspaces...' : isStaff ? 'Create a group to begin.' : 'Wait for a teacher to add you to a group.'}
              </p>
            </div>
          </div>
        )}
      </div>

      <GroupCreator
        userId={userData?.id || ''}
        isStaff={isStaff}
        onGroupCreated={handleGroupCreated}
        onClose={() => setIsModalOpen(false)}
        isOpen={isModalOpen}
      />

      <VideoCall 
        isOpen={showCall} 
        onClose={() => setShowCall(false)} 
        groupName={groups.find(g => g.id === selectedGroupId)?.name || 'Group Call'}
        groupId={selectedGroupId || undefined}
        currentUserId={userData?.id}
        currentUserName={userData?.name || 'You'}
      />
    </div>
  );
};