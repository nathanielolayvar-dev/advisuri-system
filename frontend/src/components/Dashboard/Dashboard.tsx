//This is the main container/entry point

import { useState } from 'react';
import type { Task, DashboardProps } from '../../shared/types';

// Import from ui pieces
import { TaskModal } from './ui/TaskModal';
import { TaskCard } from './ui/TaskCard';
import { GanttChart } from './ui/GanttChart';
import { AnnouncementsSidebar } from './ui/AnnouncementsSidebar';

// Import from utility pieces
import {
  SortOrder,
  priorityValues,
  getPriorityColor,
  getStatusColor,
  sortTasks,
} from './utility/utils';

// Shape of your dynamic data

export default function Dashboard({
  userName,
  dueTasks = [],
  announcements = [],
  ganttData = [],
}: DashboardProps) {
  // Use SortOrder type from the utility file
  const [sortOrder, setSortOrder] = useState<SortOrder>('high-to-low');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // compute sorted tasks using helper, it does all the sorting work
  const sortedTasks = sortTasks(dueTasks, sortOrder);

  // compute total days for GanttChart (fallback to 30 if empty)
  const totalDays =
    ganttData && ganttData.length
      ? Math.max(...ganttData.map((g) => g.startDay + g.duration))
      : 30;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Welcome, {userName}</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="space-y-3">
            {sortedTasks.map((t: Task) => (
              <TaskCard
                key={t.id}
                task={t}
                onViewDetails={(task) => setSelectedTask(task)}
                getPriorityColor={getPriorityColor}
                getStatusColor={getStatusColor}
              />
            ))}
          </div>

          <GanttChart data={ganttData} totalDays={totalDays} />
        </div>
        <AnnouncementsSidebar announcements={announcements} />
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

// Logic remains dynamic based on the props passed in
// Styling is done using Tailwind CSS classes
