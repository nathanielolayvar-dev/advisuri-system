// This is the layout/presentation layer

import { useState, useMemo, useEffect } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import api from '../../api'; // Adjust path to your api.js/ts file

// Import Types
import { Task, Announcement, GanttItem, DashboardProps } from './types';

// Import Utilities
import {
  SortOrder,
  priorityValues,
  getPriorityColor,
  getStatusColor,
  getAvatarColor,
  sortTasks,
} from './utility/utils';

//Component Imports
import { TaskCard } from './ui/TaskCard';
import { GanttChart } from './ui/GanttChart';
import { AnnouncementsSidebar } from './ui/AnnouncementsSidebar';
import { TaskModal } from './ui/TaskModal';

export default function DashboardView() {
  // State for Database Data
  const [tasks, setTasks] = useState<Task[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const [sortOrder, setSortOrder] = useState<SortOrder>('high-to-low');
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  //Fetch Data from Django API
  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      try {
        // Fetch Notes/Tasks from your Django NoteListCreate view
        const response = await api.get('/api/notes/');

        // Django returns data in response.data
        // Mapping 'content' to 'description' or 'title' if your TaskCard expects different names
        setTasks(response.data);

        // If announcements are still in Supabase, keep that call,
        // otherwise create a Django view for them too.
        // const { data } = await supabase.from('announcements').select('*');
        // setAnnouncements(data || []);
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const sortedTasks = useMemo(
    () => sortTasks(tasks as Task[], sortOrder),
    [tasks, sortOrder]
  );

  const ganttItems = useMemo(() => {
    if (!tasks.length) return [] as GanttItem[];

    const dates = tasks.map((t) => new Date(t.dueDate).getTime());
    const minDay = Math.min(...dates);

    return tasks.map((t, idx) => {
      const startDay = Math.max(
        1,
        Math.round(
          (new Date(t.dueDate).getTime() - minDay) / (1000 * 60 * 60 * 24)
        ) + 1
      );
      const duration = 1; // or derive from task details
      const progress = t.status === 'completed' ? 100 : 0;
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

  return (
    <div className="space-y-6">
      {/* 1. Hero Section */}
      <header className="bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] rounded-xl p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
        <p className="text-blue-100 opacity-90">
          You have{' '}
          <span className="font-bold underline">{tasks.length} tasks</span>{' '}
          requiring attention.
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
                <Loader2 />
              ) : sortedTasks.length === 0 ? (
                <p className="text-center text-slate-400 py-10">
                  No tasks found in the database.
                </p>
              ) : (
                sortedTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onViewDetails={setSelectedTask}
                    getPriorityColor={getPriorityColor}
                    getStatusColor={getStatusColor}
                  />
                ))
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
