import { X, Calendar, CheckCircle2 } from 'lucide-react';

interface Task {
  id: number;
  title: string;
  course: string;
  dueDate: string;
  priority: string;
  status: string;
  description: string;
}

interface TaskModalProps {
  task: Task;
  onClose: () => void;
  getPriorityColor: (priority: string) => string;
  getStatusColor: (status: string) => string;
}

export const TaskModal = ({
  task,
  onClose,
  getPriorityColor,
  getStatusColor,
}: TaskModalProps) => {
  return (
    <div className="fixed inset-0 bg-[#0F172A]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
      <div
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-[#E2E8F0] flex items-start justify-between bg-slate-50/50">
          <div>
            <h3 className="text-xl font-bold text-[#1E293B] mb-1">
              {task.title}
            </h3>
            <p className="text-sm font-medium text-[#2563EB]">{task.course}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#E2E8F0] rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-[#64748B]" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          <div className="flex gap-3">
            <span
              className={`text-xs px-3 py-1.5 rounded-lg border font-bold uppercase tracking-wider ${getPriorityColor(
                task.priority
              )}`}
            >
              {task.priority} Priority
            </span>
            <span
              className={`text-xs px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider ${getStatusColor(
                task.status
              )}`}
            >
              {task.status}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-widest mb-2">
                Due Date
              </label>
              <div className="flex items-center gap-2 text-[#475569] font-semibold">
                <Calendar className="w-5 h-5 text-[#2563EB]" />
                <span>{task.dueDate}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-widest mb-2">
              Description
            </label>
            <div className="bg-[#F8FAFC] p-4 rounded-lg border border-[#E2E8F0]">
              <p className="text-[#475569] leading-relaxed">
                {task.description}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-white border border-[#E2E8F0] text-[#475569] px-4 py-3 rounded-lg hover:bg-[#F8FAFC] transition-colors font-bold"
            >
              Close
            </button>
            <button className="flex-1 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white px-4 py-3 rounded-lg hover:opacity-90 transition-opacity shadow-md font-bold flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Mark as Completed
            </button>
          </div>
        </div>
      </div>

      {/* Click outside to close overlay */}
      <div className="absolute inset-0 -z-10" onClick={onClose}></div>
    </div>
  );
};
