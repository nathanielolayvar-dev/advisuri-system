import { Task } from '../types';

/**
 * We define the SortOrder as a type so we can reuse it
 */
export type SortOrder =
  | 'high-to-low'
  | 'low-to-high'
  | 'date-asc'
  | 'date-desc';

/**
 * Mapping priority strings to numbers for mathematical sorting
 */
export const priorityValues: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

/* Returns Tailwind CSS classes based on task priority */
export const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'bg-[#FEF2F2] text-[#DC2626] border-[#FEE2E2]';
    case 'medium':
      return 'bg-[#FFFBEB] text-[#F59E0B] border-[#FEF3C7]';
    case 'low':
      return 'bg-[#F0FDF4] text-[#10B981] border-[#D1FAE5]';
    default:
      return 'bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0]';
  }
};

/* Returns Tailwind CSS classes based on task status */
export const getStatusColor = (status: string) => {
  switch (status) {
    case 'in-progress':
      return 'bg-[#DBEAFE] text-[#2563EB]';
    case 'pending':
      return 'bg-[#F1F5F9] text-[#64748B]';
    case 'completed':
      return 'bg-[#D1FAE5] text-[#10B981]';
    default:
      return 'bg-[#F1F5F9] text-[#64748B]';
  }
};

/* Returns a hex color for user avatars based on their index */
export const getAvatarColor = (index: number) => {
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'];
  return colors[index % colors.length];
};

/* Helper to sort tasks based on the selected order, can be seen in Dashboard.tsx line 34*/
export const sortTasks = (tasks: Task[], order: SortOrder): Task[] => {
  return [...tasks].sort((a, b) => {
    if (order === 'high-to-low')
      return (
        (priorityValues[b.priority] || 0) - (priorityValues[a.priority] || 0)
      );
    if (order === 'low-to-high')
      return (
        (priorityValues[a.priority] || 0) - (priorityValues[b.priority] || 0)
      );
    if (order === 'date-asc')
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    if (order === 'date-desc')
      return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
    return 0;
  });
};
