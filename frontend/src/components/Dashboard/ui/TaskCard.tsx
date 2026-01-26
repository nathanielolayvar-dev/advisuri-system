import { Calendar } from 'lucide-react';
import type { Task } from '../../../shared/types';

interface TaskCardProps {
  task: Task;
  onViewDetails: (task: Task) => void;
  getPriorityColor: (priority: string) => string;
  getStatusColor: (status: string) => string;
}

export const TaskCard = ({
  task,
  onViewDetails,
  getPriorityColor,
  getStatusColor,
}: TaskCardProps) => {
  return (
    <div className="border border-[#E2E8F0] rounded-lg p-4 hover:border-[#2563EB] hover:shadow-md transition-all bg-white group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-[#1E293B] mb-1.5 group-hover:text-[#2563EB] transition-colors">
            {task.title}
          </h4>
          <p className="text-sm text-[#64748B]">{task.course}</p>
        </div>
        <span
          className={`text-xs px-2.5 py-1 rounded-lg border font-semibold ${getPriorityColor(
            task.priority
          )}`}
        >
          {task.priority}
        </span>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm text-[#64748B]">
            <Calendar className="w-4 h-4" />
            <span className="font-medium">{task.dueDate}</span>
          </div>
          <span
            className={`text-xs px-2.5 py-1 rounded-lg font-semibold ${getStatusColor(
              task.status
            )}`}
          >
            {task.status}
          </span>
        </div>

        <button
          onClick={() => onViewDetails(task)}
          className="text-sm text-[#2563EB] hover:text-[#1D4ED8] font-bold transition-colors"
        >
          View Details
        </button>
      </div>
    </div>
  );
};
