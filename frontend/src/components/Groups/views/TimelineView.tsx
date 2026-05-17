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
  isStaff?: boolean;
}

export const TimelineView = ({
  groupId,
  isStaff: _isStaff = false,
}: TimelineViewProps) => {
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

  useEffect(() => {
    fetchTimelineData();
  }, [groupId]);

  // Calculate date range based on task due_dates
  const { dateRange, sortedTasks } = useMemo(() => {
    if (tasks.length === 0) {
      return {
        dateRange: { start: new Date(), end: new Date() },
        sortedTasks: [],
      };
    }

    const tasksWithDueDate = tasks.filter((t) => t.due_date);

    if (tasksWithDueDate.length === 0) {
      const today = new Date();
      return {
        dateRange: {
          start: today,
          end: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000),
        },
        sortedTasks: tasks,
      };
    }

    const dueDates = tasksWithDueDate.map((t) => new Date(t.due_date!));
    const earliestDate = new Date(
      Math.min(...dueDates.map((d) => d.getTime()))
    );
    const latestDate = new Date(Math.max(...dueDates.map((d) => d.getTime())));

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
      sortedTasks: sorted,
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
    return Math.max(
      0,
      Math.floor((taskTime - startTime) / (1000 * 60 * 60 * 24))
    );
  };

  const overallProgress =
    tasks.length > 0
      ? Math.round(
          tasks.reduce(
            (acc, curr) => acc + (curr.progress_percentage || 0),
            0
          ) / tasks.length
        )
      : 0;

  const nearestDueDate = useMemo(() => {
    const tasksWithDueDate = tasks.filter((t) => t.due_date);
    if (tasksWithDueDate.length === 0) return null;
    const sorted = [...tasksWithDueDate].sort(
      (a, b) =>
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
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
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
      case 'high':
        return '#EF4444';
      case 'medium':
        return '#F59E0B';
      default:
        return '#22C55E';
    }
  };

  const gridMinWidth = useMemo(() => {
    return Math.max(500, timelineDates.length * 65);
  }, [timelineDates]);

  return (
    /* FIXED PARENT TRACKER: Added h-screen and max-h-screen to contain the layout bounds */
    <div className="h-screen max-h-screen flex flex-col select-none overflow-hidden bg-slate-50">
      {/* Header Segment */}
      <div className="flex justify-between items-center px-6 py-4 bg-white border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-lg">
              Project Timeline
            </h4>
            <p className="text-xs text-slate-500">Track deadlines</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {daysRemaining !== null && (
            <div
              className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full ${
                daysRemaining < 0
                  ? 'bg-red-100 text-red-700'
                  : daysRemaining === 0
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-blue-100 text-blue-700'
              }`}
            >
              <AlertCircle size={14} />
              {daysRemaining < 0
                ? 'Overdue!'
                : daysRemaining === 0
                  ? 'Due today!'
                  : `${daysRemaining} days remaining`}
            </div>
          )}
        </div>
      </div>

      {/* Main Container Wrapper - min-h-0 breaks child layout constraints safely */}
      <div className="flex-1 min-h-0 flex flex-col p-6 gap-4">
        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sortedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center bg-white rounded-xl border border-slate-200">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Calendar className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium">No tasks to display</p>
            <p className="text-slate-400 text-sm mt-1">
              Create tasks to see your timeline
            </p>
          </div>
        ) : (
          /* OPTION 1 APPLIED HERE: Added h-full and removed arbitrary viewport max bounds */
          <div className="flex-1 min-h-0 bg-white rounded-xl shadow-sm border border-slate-200 overflow-auto h-full">
            <div
              style={{ minWidth: `${224 + gridMinWidth}px` }}
              className="relative"
            >
              {/* Date Header Row */}
              <div className="flex bg-slate-50 border-b border-slate-200 sticky top-0 z-30 shadow-sm">
                {/* Fixed Top-Left Corner Box */}
                <div className="w-56 flex-shrink-0 px-4 py-3 bg-slate-50 sticky top-0 left-0 border-r border-slate-200 z-40">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Task Name
                  </span>
                </div>

                {/* Linked Columns tracks */}
                <div
                  className="flex-1 flex bg-slate-50"
                  style={{ minWidth: `${gridMinWidth}px` }}
                >
                  {timelineDates.map((date, i) => (
                    <div
                      key={i}
                      className={`flex-1 text-center py-3 border-r border-slate-100 last:border-r-0 min-w-[55px] ${
                        isToday(date) ? 'bg-blue-50/70' : ''
                      }`}
                    >
                      <span
                        className={`text-xs font-semibold block ${
                          isToday(date)
                            ? 'text-blue-600 font-bold'
                            : 'text-slate-500'
                        }`}
                      >
                        {formatDateHeader(date)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Task Rows Block */}
              <div className="divide-y divide-slate-100">
                {sortedTasks.map((task) => {
                  const dayIndex = getTaskDayIndex(task.due_date);
                  const maxDay = Math.max(timelineDates.length - 1, 1);
                  const leftPercent = (dayIndex / maxDay) * 100;
                  const widthPercent = Math.max(8, 100 / maxDay);
                  const taskColor =
                    task.status === 'completed'
                      ? '#22C55E'
                      : getPriorityColor(task.priority);
                  const isTaskOverdue =
                    isOverdue(task.due_date) && task.status !== 'completed';

                  return (
                    <div
                      key={task.id}
                      className={`flex items-stretch hover:bg-slate-50/80 transition-colors relative ${
                        task.progress_percentage === 100
                          ? 'bg-emerald-50/10'
                          : ''
                      }`}
                    >
                      {/* Sticky Left Task Title Card */}
                      <div className="w-56 flex-shrink-0 px-4 py-3 bg-white border-r border-slate-200 sticky left-0 z-10 flex items-center shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                        <div className="flex items-center gap-3 min-w-0 w-full">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: taskColor }}
                          />
                          <div className="min-w-0 flex-1">
                            <h5
                              className="font-semibold text-xs text-slate-800 truncate"
                              title={task.title}
                            >
                              {task.title}
                            </h5>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span
                                className={`text-[9px] font-medium px-1.5 py-0.2 rounded-full ${
                                  task.status === 'completed'
                                    ? 'bg-green-100 text-green-700'
                                    : task.status === 'in-progress'
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {task.status === 'completed'
                                  ? 'Done'
                                  : task.status === 'in-progress'
                                    ? 'In Progress'
                                    : 'Pending'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {task.progress_percentage || 0}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Unified Timeline Track view */}
                      <div
                        className="flex-1 relative h-14"
                        style={{ minWidth: `${gridMinWidth}px` }}
                      >
                        {/* Background Grid Bars */}
                        <div className="absolute inset-0 flex">
                          {timelineDates.map((date, i) => (
                            <div
                              key={i}
                              className={`flex-1 border-r border-slate-100 last:border-r-0 ${
                                isToday(date) ? 'bg-blue-50/10' : ''
                              }`}
                            />
                          ))}
                        </div>

                        {/* Gantt Render Bar */}
                        <div
                          className="absolute top-2.5 h-8 rounded-md shadow-sm transition-all duration-300 flex items-center overflow-hidden"
                          style={{
                            left: `${leftPercent}%`,
                            width: `${widthPercent}%`,
                            backgroundColor: isTaskOverdue
                              ? '#EF4444'
                              : taskColor,
                          }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/10" />
                          <div
                            className="h-full bg-black/15 transition-all duration-500"
                            style={{
                              width: `${task.progress_percentage || 0}%`,
                            }}
                          />
                          {task.progress_percentage &&
                            task.progress_percentage > 25 && (
                              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-sm">
                                {task.progress_percentage}%
                              </span>
                            )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Footer Stats Tracker Card */}
        {tasks.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-slate-700">
                  Overall Progress
                </span>
              </div>
              <span className="text-xs font-bold text-slate-800">
                {overallProgress}%
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
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
