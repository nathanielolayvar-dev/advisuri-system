import React, { useEffect, useState, useMemo } from 'react';
import { Calendar, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../../../supabaseClient';

interface TimelineTask {
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
}

interface TimelineViewProps {
  groupId: string | number;
}

export const TimelineView = ({ groupId }: TimelineViewProps) => {
  const [tasks, setTasks] = useState<TimelineTask[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch tasks from Supabase
  const fetchTimelineData = async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('group_id', groupId)
        .order('due_date', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.error('Timeline load failed', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on load and when group changes
  useEffect(() => {
    fetchTimelineData();
  }, [groupId]);

  // Calculate date range based on task due_dates
  const { dateRange, sortedTasks } = useMemo(() => {
    if (tasks.length === 0) {
      return {
        dateRange: { start: new Date(), end: new Date() },
        sortedTasks: []
      };
    }

    // Filter tasks that have due_dates
    const tasksWithDueDate = tasks.filter(t => t.due_date);
    
    if (tasksWithDueDate.length === 0) {
      const today = new Date();
      return {
        dateRange: { 
          start: today, 
          end: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000) 
        },
        sortedTasks: tasks
      };
    }

    const dueDates = tasksWithDueDate.map(t => new Date(t.due_date!));
    const earliestDate = new Date(Math.min(...dueDates.map(d => d.getTime())));
    const latestDate = new Date(Math.max(...dueDates.map(d => d.getTime())));

    const startDate = new Date(earliestDate);
    startDate.setDate(startDate.getDate() - 2);
    if (startDate < new Date()) {
      startDate.setDate(new Date().getDate() - 1);
    }

    const endDate = new Date(latestDate);
    endDate.setDate(endDate.getDate() + 3);
    const minEndDate = new Date();
    minEndDate.setDate(minEndDate.getDate() + 7);
    if (endDate < minEndDate) {
      endDate.setTime(minEndDate.getTime());
    }

    const sorted = [...tasks].sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });

    return {
      dateRange: { start: startDate, end: endDate },
      sortedTasks: sorted
    };
  }, [tasks]);

  const timelineDates = useMemo(() => {
    const dates: Date[] = [];
    const current = new Date(dateRange.start);
    while (current <= dateRange.end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, [dateRange]);

  const getTaskDayIndex = (dueDate?: string) => {
    if (!dueDate) return 0;
    const taskDate = new Date(dueDate);
    const startTime = dateRange.start.getTime();
    const taskTime = taskDate.getTime();
    return Math.max(0, Math.floor((taskTime - startTime) / (1000 * 60 * 60 * 24)));
  };

  const overallProgress =
    tasks.length > 0
      ? Math.round(
          tasks.reduce((acc, curr) => acc + (curr.progress_percentage || 0), 0) /
            tasks.length
        )
      : 0;

  const nearestDueDate = useMemo(() => {
    const tasksWithDueDate = tasks.filter(t => t.due_date);
    if (tasksWithDueDate.length === 0) return null;
    const sorted = [...tasksWithDueDate].sort((a, b) => 
      new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()
    );
    return new Date(sorted[0].due_date!);
  }, [tasks]);

  const daysRemaining = useMemo(() => {
    if (!nearestDueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(nearestDueDate);
    due.setHours(0, 0, 0, 0);
    const diff = due.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [nearestDueDate]);

  const formatDateHeader = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.getTime() === today.getTime()) return 'Today';
    if (date.getTime() === tomorrow.getTime()) return 'Tmrw';
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      default: return '#22C55E';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center px-6 py-4 bg-white border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-lg">Project Timeline</h4>
            <p className="text-xs text-slate-500">Track your group deadlines</p>
          </div>
        </div>
        
        {daysRemaining !== null && (
          <div className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full ${
            daysRemaining < 0 
              ? 'bg-red-100 text-red-700' 
              : daysRemaining === 0 
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-green-100 text-green-700'
          }`}>
            <AlertCircle size={16} />
            {daysRemaining < 0 
              ? `${Math.abs(daysRemaining)} days overdue`
              : daysRemaining === 0 
                ? 'Due today!'
                : `${daysRemaining} days remaining`
            }
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 bg-slate-50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sortedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
              <Calendar className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium">No tasks to display</p>
            <p className="text-slate-400 text-sm mt-1">Create tasks to see your timeline</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Date Header Row */}
            <div className="flex bg-slate-50 border-b border-slate-100">
              <div className="w-56 flex-shrink-0 px-4 py-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Task</span>
              </div>
              <div className="flex-1 flex">
                {timelineDates.map((date, i) => (
                  <div 
                    key={i} 
                    className={`flex-1 text-center py-3 border-l border-slate-100 ${
                      isToday(date) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <span className={`text-xs font-medium ${
                      isToday(date) ? 'text-blue-600' : 'text-slate-500'
                    }`}>
                      {formatDateHeader(date)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Task Rows */}
            {sortedTasks.map((task) => {
              const dayIndex = getTaskDayIndex(task.due_date);
              const maxDay = Math.max(timelineDates.length - 1, 1);
              const leftPercent = (dayIndex / maxDay) * 100;
              const widthPercent = Math.max(10, 100 / maxDay);
              const taskColor = task.status === 'completed' ? '#22C55E' : getPriorityColor(task.priority);
              const isTaskOverdue = isOverdue(task.due_date) && task.status !== 'completed';
              
              return (
                <div key={task.id} className="flex border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="w-56 flex-shrink-0 px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: taskColor }}
                      />
                      <div>
                        <h5 className="font-semibold text-sm text-slate-800">{task.title}</h5>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            task.status === 'completed' ? 'bg-green-100 text-green-700' :
                            task.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {task.status === 'completed' ? 'Done' : task.status === 'in-progress' ? 'In Progress' : 'Pending'}
                          </span>
                          <span className="text-xs text-slate-400">{task.progress_percentage || 0}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 relative h-16">
                    {/* Background Grid */}
                    <div className="absolute inset-0 flex">
                      {timelineDates.map((_, i) => (
                        <div key={i} className="flex-1 border-l border-slate-100" />
                      ))}
                    </div>
                    
                    {/* Task Bar */}
                    <div
                      className="absolute top-3 h-10 rounded-lg shadow-sm transition-all duration-300"
                      style={{
                        left: `${leftPercent}%`,
                        width: `${widthPercent}%`,
                        backgroundColor: isTaskOverdue ? '#EF4444' : taskColor,
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/10 rounded-lg" />
                      <div
                        className="h-full bg-black/10 rounded-lg"
                        style={{ width: `${task.progress_percentage || 0}%` }}
                      />
                      {task.progress_percentage && task.progress_percentage > 20 && (
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                          {task.progress_percentage}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Stats */}
        {tasks.length > 0 && (
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-slate-700">Overall Progress</span>
              </div>
              <span className="text-sm font-bold text-slate-800">{overallProgress}%</span>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
