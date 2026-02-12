export interface User {
  id: number;
  username: string;
  role?: string;
}

/**
 * Core Group Information
 */
export interface Group {
  id: number;
  name: string;
  course: string;
  members: number;
}

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

/**
 * Tasks & Notes
 */
export type TaskStatus = 'completed' | 'in-progress' | 'pending';

export interface TaskNote {
  id: number;
  title: string;
  content: string;
  created_at: string; // Matches your Django backend
  author_name: string;
  status?: 'completed' | 'in-progress' | 'pending';
}

/**
 * Project Timeline (Gantt Chart)
 */
export interface TimelineTask {
  id: number;
  task_name: string;
  start_day: number;
  duration_days: number;
  progress_percentage: number;
  assignee_name: string;
  hex_color: string;
}

/**
 * Chat & Messaging
 */
export interface Message {
  id: number;
  sender_name: string;
  sender_initials: string;
  text: string;
  timestamp: string; // ISO string from Django
  is_self: boolean;
  avatar_color?: string;
}

/**
 * Document & File Management
 */
export type DocumentType = 'pdf' | 'excel' | 'code' | 'doc' | 'image' | 'other';

export interface Document {
  id: number;
  name: string;
  file: string;
  file_url: string;
  file_type: DocumentType;
  file_size: string;
  uploaded_by: number;
  uploaded_by_name: string;
  created_at: string;
}

// src/components/analytics
export interface MemberBandwidth {
  name: string;
  risk_score: number; // The percentage of burnout risk
}

export interface GroupAnalytics {
  // Descriptive Features
  activity_pulse: number;
  task_velocity: number;
  contribution_balance: number;

  // Predictive Features (ML-based)
  at_risk_status: 'High' | 'Low' | 'Medium';
  tone_analysis: string;
  workload_prediction: number;

  // Forecasting Features
  completion_forecast: string; // ISO Date string or "N/A"
  milestone_buffer: number;
  member_bandwidth: MemberBandwidth[];
}
