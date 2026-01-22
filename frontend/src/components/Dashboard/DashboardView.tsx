import { useState, useMemo, useEffect } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import api from '../../api'; // Adjust path to your api.js/ts file

// 1. Component Imports
import { TaskCard } from './TaskCard';
import { GanttChart } from './GanttChart';
import { AnnouncementsSidebar } from './AnnouncementsSidebar';
import { TaskModal } from './TaskModal';

type SortOrder = 'high-to-low' | 'low-to-high' | 'date-asc' | 'date-desc';

export default function DashboardView() {
  // State for Database Data
  const [tasks, setTasks] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [sortOrder, setSortOrder] = useState<SortOrder>('high-to-low');
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  //Fetch Data from Djano API
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

  // Helper Functions for Styling (Remain same)
  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      high: 'bg-[#FEF2F2] text-[#DC2626] border-[#FEE2E2]',
      medium: 'bg-[#FFFBEB] text-[#F59E0B] border-[#FEF3C7]',
      low: 'bg-[#F0FDF4] text-[#10B981] border-[#D1FAE5]',
    };
    return colors[priority] || 'bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0]';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'in-progress': 'bg-[#DBEAFE] text-[#2563EB]',
      pending: 'bg-[#F1F5F9] text-[#64748B]',
      completed: 'bg-[#D1FAE5] text-[#10B981]',
    };
    return colors[status] || 'bg-[#F1F5F9] text-[#64748B]';
  };

  // 3. Sorting Logic (Updated to use live tasks state)
  const sortedTasks = useMemo(() => {
    const priorityValues = { high: 3, medium: 2, low: 1 };
    return [...tasks].sort((a, b) => {
      if (sortOrder === 'high-to-low')
        return (
          (priorityValues[b.priority as keyof typeof priorityValues] || 0) -
          (priorityValues[a.priority as keyof typeof priorityValues] || 0)
        );
      if (sortOrder === 'low-to-high')
        return (
          (priorityValues[a.priority as keyof typeof priorityValues] || 0) -
          (priorityValues[b.priority as keyof typeof priorityValues] || 0)
        );
      if (sortOrder === 'date-asc')
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
    });
  }, [sortOrder, tasks]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-medium">Fetching your dashboard...</p>
      </div>
    );
  }

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
              {sortedTasks.length === 0 ? (
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
          <GanttChart data={tasks} totalDays={30} />
        </div>

        <aside className="lg:col-span-1">
          <AnnouncementsSidebar announcements={announcements} />
        </aside>
      </div>

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          getPriorityColor={getPriorityColor}
          getStatusColor={getStatusColor}
        />
      )}
    </div>
  );
}
