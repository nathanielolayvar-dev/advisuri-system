import React, { useEffect, useState } from 'react';
import { Calendar, CheckCircle2 } from 'lucide-react';
import { TimelineTask } from '../../../shared/types';
import { getStatusColor } from '../../../shared/utils';
import api from '../../../api';

interface TimelineViewProps {
  selectedGroup: { id: string | number };
}

export const TimelineView = ({ selectedGroup }: TimelineViewProps) => {
  // Eventually, this will be fetched from your Django backend
  const [tasks, setTasks] = React.useState<TimelineTask[]>([]);
  const [loading, setLoading] = useState(false);

  // 1. Logic to fetch data
  const fetchTimelineData = async () => {
    if (!selectedGroup?.id) return;
    setLoading(true);
    try {
      // Use the generic type <TimelineTask[]> so response.data is typed correctly
      const response = await api.get<TimelineTask[]>(
        `/api/tasks/?group=${selectedGroup.id}`
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
  }, [selectedGroup.id]);

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
    <div className="space-y-6">
      {/* Header with Due Date */}
      <div className="flex justify-between items-center">
        <h4 className="font-bold text-[#1E293B] flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#2563EB]" /> Project Timeline
        </h4>
        <div className="px-3 py-1.5 border border-[#E2E8F0] rounded-lg text-sm text-[#64748B] flex items-center gap-2 bg-white">
          <Calendar className="w-4 h-4" />
          Due: Jan 20, 2026
        </div>
      </div>

      {/* Gantt Chart Container */}
      <div className="border border-[#E2E8F0] rounded-xl overflow-x-auto bg-white">
        <div className="min-w-[800px]">
          {/* Days Header */}
          <div className="grid grid-cols-12 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <div className="col-span-3 p-4 border-r border-[#E2E8F0]"></div>
            {[...Array(9)].map((_, i) => (
              <div
                key={i}
                className="col-span-1 p-4 text-center text-xs font-semibold text-[#64748B]"
              >
                Day {i + 1}
              </div>
            ))}
          </div>

          {/* Task Rows */}
          <div className="divide-y divide-[#F1F5F9]">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="grid grid-cols-12 group hover:bg-[#F8FAFC] transition-colors"
              >
                <div className="col-span-3 p-4 border-r border-[#E2E8F0]">
                  <h5 className="font-bold text-[#1E293B] text-sm">
                    {task.task_name}
                  </h5>
                  <p className="text-[10px] text-[#94A3B8]">
                    {task.assignee_name} • {task.progress_percentage}%
                  </p>
                </div>
                <div className="col-span-9 p-4 relative flex items-center">
                  {/* The Progress Bar Positioning */}
                  <div
                    className="h-8 rounded-lg shadow-sm relative overflow-hidden"
                    style={{
                      marginLeft: `${(task.start_day - 1) * 11.11}%`,
                      width: `${task.duration_days * 11.11}%`,
                      backgroundColor: task.hex_color,
                    }}
                  >
                    {/* Darker progress overlay */}
                    <div
                      className="absolute inset-0 bg-black/20"
                      style={{ width: `${task.progress_percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Overall Progress Bar */}
      <div className="p-5 bg-[#EFF6FF] rounded-xl border border-[#BFDBFE]">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-5 h-5 text-[#2563EB]" />
          <span className="font-bold text-[#1E293B]">Overall Progress</span>
        </div>
        <div className="w-full bg-white h-3 rounded-full overflow-hidden border border-[#DBEAFE]">
          <div
            className="h-full bg-[#2563EB] transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-sm font-medium">
          <span className="text-[#2563EB]">{overallProgress}% complete</span>
          <span className="text-[#64748B]">6 days remaining</span>
        </div>
      </div>
    </div>
  );
};
