import React, { useEffect, useState } from 'react';
import { Calendar, CheckCircle2 } from 'lucide-react';
import { TimelineTask } from '../../../shared/types';
import { getStatusColor } from '../../../shared/utils';
import '../../../styles/TimelineView.css';
import api from '../../../api';

interface TimelineViewProps {
  groupId: string | number;
}

export const TimelineView = ({ groupId }: TimelineViewProps) => {
  // Eventually, this will be fetched from your Django backend
  const [tasks, setTasks] = React.useState<TimelineTask[]>([]);
  const [loading, setLoading] = useState(false);

  // 1. Logic to fetch data
  const fetchTimelineData = async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      // Use the generic type <TimelineTask[]> so response.data is typed correctly
      const response = await api.get<TimelineTask[]>(
        `/api/tasks/?group=${groupId}`
      );
      setTasks(response.data);
    } catch (err) {
      console.error('Timeline load failed', err);
    } finally {
      setLoading(false);
    }
  };

  // 2. TRIGGER: This makes the fetch happen on load and on group switch
  useEffect(() => {
    fetchTimelineData();
  }, [groupId]);

  // Calculate max days needed for the chart
  const maxDay =
    tasks.length > 0
      ? Math.max(...tasks.map((t) => t.start_day + t.duration_days))
      : 9;

  const dayColumns = Math.max(9, maxDay); // Always show at least 9

  // Calculate overall progress for the bottom bar
  const overallProgress =
    tasks.length > 0
      ? Math.round(
          tasks.reduce((acc, curr) => acc + curr.progress_percentage, 0) /
            tasks.length
        )
      : 0;

  //Set your target due date
  const dueDate = new Date('2026-02-15'); // Update this to your desired date
  const today = new Date();

  //Calculate the difference in milliseconds and convert to days
  const timeDiff = dueDate.getTime() - today.getTime();
  const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));

  //Determine the status text
  const remainingText =
    daysRemaining > 0
      ? `${daysRemaining} days remaining`
      : daysRemaining === 0
        ? 'Due today'
        : `${Math.abs(daysRemaining)} days overdue`;

  return (
    <div className="timeline-container">
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h4 className="font-bold text-[#1E293B] flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#2563EB]" /> Project Timeline
          </h4>
        </div>

        {/* Gantt Chart */}
        <div className="gantt-card">
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="gantt-grid grid-header">
                <div className="task-info-cell" />
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="day-cell border-l border-[#E2E8F0]">
                    Day {i + 1}
                  </div>
                ))}
              </div>

              <div className="divide-y divide-[#F1F5F9]">
                {tasks.map((task) => (
                  <div key={task.id} className="gantt-grid task-row">
                    <div className="task-info-cell">
                      <h5 className="font-bold text-sm">{task.task_name}</h5>
                      <p className="text-[10px] text-[#94A3B8]">
                        {task.assignee_name} • {task.progress_percentage}%
                      </p>
                    </div>
                    <div className="bar-container border-l border-[#E2E8F0]">
                      <div
                        className="progress-bar"
                        style={{
                          marginLeft: `${(task.start_day - 1) * 11.11}%`,
                          width: `${task.duration_days * 11.11}%`,
                          backgroundColor: task.hex_color,
                        }}
                      >
                        <div
                          className="progress-fill"
                          style={{ width: `${task.progress_percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
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
