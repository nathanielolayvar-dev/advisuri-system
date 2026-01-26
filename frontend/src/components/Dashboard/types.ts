export interface Task {
  id: number;
  title: string;
  course: string;
  priority: 'high' | 'medium' | 'low';
  status: string;
  dueDate: string;
  description: string;
}

export interface Announcement {
  id: number;
  title: string;
  group: string;
  author: string;
  content: string;
  time: string;
  avatar: string;
  isNew: boolean;
}

export interface GanttItem {
  task: string;
  startDay: number;
  duration: number;
  progress: number;
  color: string;
}

export interface DashboardProps {
  userName: string;
  dueTasks: Task[];
  announcements: Announcement[];
  ganttData: GanttItem[];
}
