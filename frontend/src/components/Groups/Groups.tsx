import React, { useState, useEffect } from 'react';
import { Video, MessageSquare, FileText, Clock, Users, MoreVertical, Calendar } from 'lucide-react';
import { GroupTabs } from './GroupTabs';
import { GroupCreator } from '../GroupCreator/GroupCreator';
import { UserSearchDropdown } from './UserSearchDropdown';
import { ChatView } from './views/ChatView';
import { TasksView } from './views/TasksView';
import { TimelineView } from './views/TimelineView';
import { ScheduleView } from './views/ScheduleView';
import { VideoCall } from './views/VideoCall';
import { useSidebar } from '../Sidebar/SidebarContext';
import { supabase } from '../../supabaseClient';
import { useSearchParams } from 'react-router-dom';

type ViewType = 'chat' | 'tasks' | 'timeline' | 'schedule';

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
  const [activeView, setActiveView] = useState<ViewType>('timeline');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCall, setShowCall] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [searchParams] = useSearchParams();
  
  const { userData } = useSidebar();
  const isStaff = userData?.isStaff === true;

  // Handle URL query params for navigation from dashboard
  useEffect(() => {
    const groupId = searchParams.get('groupId');
    const view = searchParams.get('view');
    
    if (groupId && groups.length > 0) {
      // Check if group exists in user's groups
      const groupExists = groups.some(g => g.id === groupId);
      if (groupExists) {
        setSelectedGroupId(groupId);
        if (view === 'tasks' || view === 'timeline' || view === 'chat' || view === 'schedule') {
          setActiveView(view);
        }
      }
    }
  }, [searchParams, groups]);

  // Close action menu when the selected group changes
  useEffect(() => {
    setShowActions(false);
  }, [selectedGroupId]);

  const fetchGroups = async () => {
    if (!userData?.id) return;

    setLoading(true);

    const buildGroupTransform = (data: any[], includeCompleted: boolean) =>
      (data || []).map((g: any) => ({
        id: g.group_id,
        name: g.group_name,
        course: g.course,
        created_by: g.created_by,
        is_completed: includeCompleted ? (g.is_completed || false) : false,
        members: g.group_members?.map((mem: any) => mem.user_id) || [],
        member_details: g.group_members?.map((mem: any) => ({
          id: mem.user_id,
          username: mem.users?.full_name || mem.users?.username || 'Unknown'
        })) || []
      }));

    try {
      // If the `is_completed` column is missing in the DB, this query will fail.
      // We fall back to a minimal query so the UI can still load groups.
      const { data, error } = await supabase
        .from('groups')
        .select(`
          group_id,
          group_name,
          course,
          created_by,
          created_at,
          is_completed,
          group_members (
            user_id,
            users (
              full_name,
              email
            )
          )
        `);

      if (error) {
        const shouldRetryWithoutCompleted = (error.message || '').includes('is_completed');
        if (shouldRetryWithoutCompleted) {
          const { data: dataWithoutCompleted, error: retryError } = await supabase
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

          if (retryError) throw retryError;
          const transformed = buildGroupTransform(dataWithoutCompleted || [], false);
          setGroups(transformed);
          if (transformed.length > 0 && !selectedGroupId) {
            setSelectedGroupId(transformed[0].id);
          }
          return;
        }
        throw error;
      }

      const transformed = buildGroupTransform(data || [], true);

      // Teachers should only see the groups they created.
      // Students should only see groups where they are a member.
      const visibleGroups = transformed.filter((g) => {
        if (isStaff) {
          // Teachers should only see groups they created or where they are a member.
          return g.created_by === userData?.id || g.members.includes(userData?.id);
        }
        // Students see only groups they're a member of.
        return g.members.includes(userData?.id);
      });

      setGroups(visibleGroups);

      // Auto-select the first group if nothing is selected yet
      if (visibleGroups.length > 0 && !selectedGroupId) {
        setSelectedGroupId(visibleGroups[0].id);
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
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold text-slate-900">{activeGroup?.name}</h2>
                      {activeGroup?.is_completed && (
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700">
                          Completed
                        </span>
                      )}
                      <MemberStack members={activeGroup?.member_details || []} />
                    </div>
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
                  {isStaff && (
                    <div className="relative">
                      <button
                        className="px-3 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                        onClick={() => setShowActions(prev => !prev)}
                        aria-label="Group actions"
                      >
                        <MoreVertical size={18} />
                      </button>

                      {showActions && (
                        <div className="absolute right-0 mt-2 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-20">
                          <button
                            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                            onClick={async () => {
                              setShowActions(false);
                              if (!selectedGroupId) return;
                              const confirmDelete = window.confirm('Delete this group? This cannot be undone.');
                              if (!confirmDelete) return;
                              try {
                                // Remove membership links first (in case FK rules are restrictive)
                                await supabase.from('group_members').delete().eq('group_id', selectedGroupId);
                                await supabase.from('groups').delete().eq('group_id', selectedGroupId);
                                await fetchGroups();
                                setSelectedGroupId(null);
                              } catch (err) {
                                console.error('Failed to delete group:', err);
                                alert('Failed to delete group.');
                              }
                            }}
                          >
                            Delete Group
                          </button>
                          <button
                            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                            onClick={async () => {
                              setShowActions(false);
                              if (!selectedGroupId) return;
                              const confirmComplete = window.confirm('Mark this group as completed?');
                              if (!confirmComplete) return;
                              try {
                                const { error } = await supabase
                                  .from('groups')
                                  .update({ is_completed: true })
                                  .eq('group_id', selectedGroupId);
                                if (error) throw error;
                                await fetchGroups();
                              } catch (err: any) {
                                console.error('Failed to mark group complete:', err);
                                alert('Failed to mark group as completed. (Ensure group has `is_completed` field.)');
                              }
                            }}
                          >
                            Mark Completed
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-6 mt-6 -mb-px">
                {([
                  { id: 'chat', icon: MessageSquare, label: 'Chat & Docs' },
                  { id: 'tasks', icon: FileText, label: 'Tasks' },
                  { id: 'timeline', icon: Clock, label: 'Timeline' },
                  { id: 'schedule', icon: Calendar, label: 'Schedule' },
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

            <div className="flex-1 overflow-auto p-6">
              {activeView === 'schedule' ? (
                <ScheduleView groupId={selectedGroupId} isStaff={isStaff} />
              ) : (
                <div className="h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  {activeView === 'chat' && <ChatView groupId={selectedGroupId} />}
                  {activeView === 'tasks' && <TasksView groupId={selectedGroupId} isStaff={isStaff} userId={userData?.id || ''} />}
                  {activeView === 'timeline' && <TimelineView groupId={selectedGroupId} />}
                </div>
              )}
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