// This is the layout/presentation layer

import { useState, useMemo, useEffect } from 'react';
import { AlertCircle, Loader2, Calendar, Folder } from 'lucide-react';
import { supabase } from '../../supabaseClient';

// Import Types
import {
  Announcement,
  GanttItem,
} from '../../shared/types';

// Import Utilities
import {
  SortOrder,
  getPriorityColor,
  getStatusColor,
  getAvatarColor,
} from '../../shared/utils';

//Component Imports
import { TaskCard } from './ui/TaskCard';
import { GanttChart } from './ui/GanttChart';
import { AnnouncementsSidebar } from './ui/AnnouncementsSidebar';
import { TaskModal } from './ui/TaskModal';

// Extended task type with group info
interface DashboardTask {
  id: number;
  title: string;
  description?: string;
  group_id: string;
  creator_id: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed';
  due_date?: string;
  progress_percentage?: number;
  assigned_to?: string;
  group_name?: string;
}

export default function DashboardView() {
  // State for Database Data
  const [tasks, setTasks] = useState<DashboardTask[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const [sortOrder, setSortOrder] = useState<SortOrder>('high-to-low');
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getUser();
  }, []);

  //Fetch Data from Supabase - only tasks from user's groups
  useEffect(() => {
    async function fetchDashboardData() {
      if (!currentUserId) return;
      
      setLoading(true);
      try {
        // First, get the groups the user is a member of
        const { data: groupMembers, error: membersError } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', currentUserId);

        if (membersError) throw membersError;

        if (!groupMembers || groupMembers.length === 0) {
          setTasks([]);
          setLoading(false);
          return;
        }

        const userGroupIds = groupMembers.map(gm => gm.group_id);

        // Fetch tasks from those groups with group info
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select(`
            *,
            groups (group_name)
          `)
          .in('group_id', userGroupIds)
          .neq('status', 'completed')
          .order('due_date', { ascending: true });

        if (tasksError) throw tasksError;

        // Format tasks with group name
        const formattedTasks: DashboardTask[] = (tasksData || []).map((task: any) => ({
          ...task,
          group_name: task.groups?.group_name || 'Unknown Group'
        }));

        setTasks(formattedTasks);

        // Also fetch announcements if needed
        const { data: announcementsData } = await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);
          
        setAnnouncements(announcementsData || []);

      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setLoading(false);
      }
    }

    if (currentUserId) {
      fetchDashboardData();
    }
  }, [currentUserId]);

  // Sort tasks
  const sortedTasks = useMemo(() => {
    const sorted = [...tasks];
    
    if (sortOrder === 'date-asc') {
      return sorted.sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      });
    } else {
      // Priority sort
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return sorted.sort((a, b) => {
        const aP = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2;
        const bP = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2;
        return aP - bP;
      });
    }
  }, [tasks, sortOrder]);

  const ganttItems = useMemo(() => {
    if (!tasks.length) return [] as GanttItem[];

    const validTasks = tasks.filter(t => t.due_date);
    if (!validTasks.length) return [] as GanttItem[];

    const dates = validTasks.map((t) => new Date(t.due_date!).getTime());
    const minDay = Math.min(...dates);

    return validTasks.map((t, idx) => {
      const startDay = Math.max(
        1,
        Math.round(
          (new Date(t.due_date!).getTime() - minDay) / (1000 * 60 * 60 * 24)
        ) + 1
      );
      const duration = 1;
      const progress = t.status === 'completed' ? 100 : t.progress_percentage || 0;
      const color = getAvatarColor(idx);

      return {
        task: t.title,
        startDay,
        duration,
        progress,
        color,
      } as GanttItem;
    });
  }, [tasks]);

  // Calculate days remaining
  const getDaysRemaining = (dueDate?: string) => {
    if (!dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diff = due.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      {/* 1. Hero Section */}
      <header className="bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] rounded-xl p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
        <p className="text-blue-100 opacity-90">
          You have{' '}
          <span className="font-bold underline">{tasks.length} tasks</span>{' '}
          requiring attention across your groups.
        </p>
      </header>

      {/* 2. Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] overflow-hidden">
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-[#2563EB]" />
                </div>
                <h2 className="text-lg font-bold text-[#1E293B]">
                  Upcoming Deadlines
                </h2>
              </div>

              <div className="relative flex items-center gap-2">
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                  className="text-sm border-none bg-slate-50 rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
                >
                  <option value="high-to-low">Priority</option>
                  <option value="date-asc">Due Date</option>
                </select>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : sortedTasks.length === 0 ? (
                <div className="text-center py-10">
                  <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-400 font-medium">No upcoming deadlines</p>
                  <p className="text-slate-300 text-sm">You're all caught up!</p>
                </div>
              ) : (
                sortedTasks.map((task) => {
                  const daysLeft = getDaysRemaining(task.due_date);
                  
                  return (
                    <div 
                      key={task.id}
                      className="flex items-center gap-4 p-4 rounded-lg border border-[#E2E8F0] hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                      onClick={() => setSelectedTask(task)}
                    >
                      {/* Priority indicator */}
                      <div 
                        className="w-1 h-12 rounded-full"
                        style={{ backgroundColor: getPriorityColor(task.priority) }}
                      />
                      
                      {/* Task info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-[#1E293B] truncate">{task.title}</h3>
                          {task.status === 'in-progress' && (
                            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                              In Progress
                            </span>
                          )}
                        </div>
                        
                        {/* Group name */}
                        <div className="flex items-center gap-1 text-sm text-slate-500">
                          <Folder size={14} />
                          <span>{task.group_name}</span>
                        </div>
                      </div>
                      
                      {/* Due date */}
                      <div className="text-right flex-shrink-0">
                        {task.due_date && (
                          <div className={`text-sm font-medium ${
                            daysLeft === null ? 'text-slate-400' :
                            daysLeft < 0 ? 'text-red-500' :
                            daysLeft === 0 ? 'text-yellow-600' :
                            'text-slate-600'
                          }`}>
                            {daysLeft === 0 
                              ? 'Due today!' 
                              : daysLeft === 1 
                                ? 'Due tomorrow'
                                : daysLeft !== null && daysLeft < 0 
                                  ? `${Math.abs(daysLeft)} days overdue`
                                  : new Date(task.due_date).toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric' 
                                    })
                            }
                          </div>
                        )}
                        {task.due_date && (
                          <div className="text-xs text-slate-400">
                            {task.progress_percentage || 0}% complete
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Timeline Section */}
          <GanttChart data={ganttItems} totalDays={30} />
        </div>

        <aside className="lg:col-span-1">
          <AnnouncementsSidebar announcements={announcements} />
        </aside>
      </div>

      {selectedTask ? (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          getPriorityColor={getPriorityColor}
          getStatusColor={getStatusColor}
        />
      ) : null}
    </div>
  );
}
