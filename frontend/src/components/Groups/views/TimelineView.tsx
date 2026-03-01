import React, { useEffect, useState, useMemo } from 'react';
import { Calendar, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import '../../../styles/TimelineView.css';

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
      // If no tasks have due dates, show all tasks with default range
      const today = new Date();
      return {
        dateRange: { 
          start: today, 
          end: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000) 
        },
        sortedTasks: tasks
      };
    }

    // Parse due dates and find range
    const dueDates = tasksWithDueDate.map(t => new Date(t.due_date!));
    const earliestDate = new Date(Math.min(...dueDates.map(d => d.getTime())));
    const latestDate = new Date(Math.max(...dueDates.map(d => d.getTime())));

    // Add buffer: start from 2 days before earliest or today
    const startDate = new Date(earliestDate);
    startDate.setDate(startDate.getDate() - 2);
    if (startDate < new Date()) {
      startDate.setDate(new Date().getDate() - 1);
    }

    // End 3 days after latest or at least 7 days from now
    const endDate = new Date(latestDate);
    endDate.setDate(endDate.getDate() + 3);
    const minEndDate = new Date();
    minEndDate.setDate(minEndDate.getDate() + 7);
    if (endDate < minEndDate) {
      endDate.setTime(minEndDate.getTime());
    }

    // Sort tasks by due date
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

  // Generate array of dates for the timeline
  const timelineDates = useMemo(() => {
    const dates: Date[] = [];
    const current = new Date(dateRange.start);
    while (current <= dateRange.end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, [dateRange]);

  // Calculate day index for a task based on its due date
  const getTaskDayIndex = (dueDate?: string) => {
    if (!dueDate) return 0;
    const taskDate = new Date(dueDate);
    const startTime = dateRange.start.getTime();
    const taskTime = taskDate.getTime();
    return Math.max(0, Math.floor((taskTime - startTime) / (1000 * 60 * 60 * 24)));
  };

  // Calculate overall progress for the bottom bar
  const overallProgress =
    tasks.length > 0
      ? Math.round(
          tasks.reduce((acc, curr) => acc + (curr.progress_percentage || 0), 0) /
            tasks.length
        )
      : 0;

  // Get nearest due date for the countdown
  const nearestDueDate = useMemo(() => {
    const tasksWithDueDate = tasks.filter(t => t.due_date);
    if (tasksWithDueDate.length === 0) return null;
    
    const sorted = [...tasksWithDueDate].sort((a, b) => 
      new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()
    );
    return new Date(sorted[0].due_date!);
  }, [tasks]);

  // Calculate days remaining until nearest due date
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

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed': return '#22C55E';
      case 'in-progress': return '#3B82F6';
      default: return '#94A3B8';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      default: return '#22C55E';
    }
  };

  return (
    <div className="timeline-container">
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h4 className="font-bold text-[#1E293B] flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#2563EB]" /> Project Timeline
          </h4>
          {daysRemaining !== null && (
            <div className={`text-sm font-medium px-3 py-1 rounded-full ${
              daysRemaining < 0 
                ? 'bg-red-100 text-red-700' 
                : daysRemaining === 0 
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-green-100 text-green-700'
            }`}>
              {daysRemaining < 0 
                ? `${Math.abs(daysRemaining)} days overdue`
                : daysRemaining === 0 
                  ? 'Due today!'
                  : `${daysRemaining} days until first deadline`
              }
            </div>
          )}
        </div>

        {/* Gantt Chart */}
        <div className="gantt-card">
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Date Header Row */}
              <div className="gantt-grid grid-header">
                <div className="task-info-cell" />
                {timelineDates.map((date, i) => (
                  <div 
                    key={i} 
                    className={`day-cell border-l border-[#E2E8F0] text-center ${
                      isToday(date) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className={`text-xs ${isToday(date) ? 'text-blue-600 font-bold' : 'text-[#94A3B8]'}`}>
                      {formatDateHeader(date)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Task Rows */}
              <div className="divide-y divide-[#F1F5F9]">
                {sortedTasks.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    No tasks to display
                  </div>
                ) : (
                  sortedTasks.map((task) => {
                    const dayIndex = getTaskDayIndex(task.due_date);
                    const maxDay = Math.max(timelineDates.length - 1, 1);
                    const leftPercent = (dayIndex / maxDay) * 100;
                    const widthPercent = Math.max(8, 100 / maxDay);
                    const taskColor = task.status === 'completed' ? '#22C55E' : getPriorityColor(task.priority);
                    
                    return (
                      <div key={task.id} className="gantt-grid task-row">
                        <div className="task-info-cell">
                          <h5 className="font-bold text-sm">{task.title}</h5>
                          <p className="text-[10px] text-[#94A3B8]">
                            {task.status === 'completed' ? 'Completed' : task.status === 'in-progress' ? 'In Progress' : 'Pending'} 
                            • {task.progress_percentage || 0}%
                            {task.due_date && (
                              <span className={`ml-1 ${
                                isOverdue(task.due_date) ? 'text-red-500' : ''
                              }`}>
                                • Due: {new Date(task.due_date).toLocaleDateString()}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="bar-container border-l border-[#E2E8F0] relative">
                          {/* Task bar positioned by due date */}
                          <div
                            className="progress-bar absolute"
                            style={{
                              left: `${leftPercent}%`,
                              width: `${widthPercent}%`,
                              backgroundColor: isOverdue(task.due_date) && task.status !== 'completed' ? '#EF4444' : taskColor,
                              opacity: isOverdue(task.due_date) && task.status !== 'completed' ? 0.8 : 1,
                            }}
                            title={task.due_date ? `Due: ${new Date(task.due_date).toLocaleDateString()}` : 'No due date'}
                          >
                            <div
                              className="progress-fill"
                              style={{ width: `${task.progress_percentage || 0}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Stats */}
        <div className="stats-card">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-[#2563EB]" />
            <span className="font-bold text-sm">Overall Progress</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
