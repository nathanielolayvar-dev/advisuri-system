/**
 * Supabase Database Types
 * These types correspond to the Supabase tables and Row Level Security (RLS) policies.
 *
 * Roles:
 * - 'admin'   : Full access to all tables
 * - 'teacher' : Can manage groups, create/grade tasks, view all members
 * - 'student' : Can access only their own groups, submit work, chat
 *
 * Table naming: All tables use non-prefixed names (no api_* prefix).
 */

// ============================================================================
// Core User Types (maps to `users` table)
// ============================================================================

export interface SupabaseUser {
  user_id: string;       // UUID — matches auth.users.id
  full_name: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
  is_active: boolean;
  created_at: string;
  profile_picture_url?: string | null;
}

/**
 * @deprecated Use SupabaseUser instead.
 * Kept for backward compatibility with old api_user references.
 */
export interface ApiUser {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  is_staff: boolean;
  role: string;
}

// ============================================================================
// Group Types (maps to `groups` + `group_members` tables)
// ============================================================================

export interface SupabaseGroup {
  group_id: string;      // UUID
  group_name: string;
  course: string;
  created_by: string;    // UUID → users.user_id
  created_at: string;
}

export interface SupabaseGroupMember {
  group_id: string;      // UUID
  user_id: string;       // UUID
  joined_at: string;
}

/**
 * @deprecated Use SupabaseGroup instead.
 */
export interface ApiGroup {
  id: string;
  name: string;
  course: string;
  created_at: string;
}

/**
 * @deprecated Use SupabaseGroupMember instead.
 */
export interface ApiGroupMember {
  id: string;
  group_id: string;
  user_id: string;
}

// ============================================================================
// Task Types (maps to `tasks` table)
// ============================================================================

export interface SupabaseTask {
  id: string;            // UUID
  title: string;
  description?: string;
  group_id: string;      // UUID → groups.group_id
  creator_id: string;    // UUID → users.user_id
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed';
  due_date?: string;
  max_score?: number;
  final_score?: number;
  assigned_to?: string;  // UUID → users.user_id
  progress_percentage?: number;
  completed_at?: string;
  is_overdue?: boolean;
  created_at: string;
  updated_at?: string;
}

// ============================================================================
// Submission Types (maps to `submissions` table)
// ============================================================================

export interface SupabaseSubmission {
  id: string;            // UUID
  task_id: string;       // UUID → tasks.id
  submitted_by: string;  // UUID → users.user_id
  version_number: number;
  overall_feedback?: string;
  is_accepted?: boolean;
  created_at: string;
}

// ============================================================================
// Attachment Types (maps to `attachments` table)
// ============================================================================

export interface SupabaseAttachment {
  id: string;            // UUID
  submission_id: string; // UUID → submissions.id
  file_name: string;
  file_url: string;
  file_type?: string;
  uploaded_at: string;
}

// ============================================================================
// Task Note Types (maps to `tasknotes` table)
// ============================================================================

export interface SupabaseTaskNote {
  id: string;            // UUID
  content: string;
  task_id: string;       // UUID → tasks.id
  author_id: string;     // UUID → users.user_id
  submission_id?: string;
  created_at: string;
  // Joined field from users table
  users?: { full_name: string } | null;
}

// ============================================================================
// Chat Types (maps to `chat_messages` table)
// ============================================================================

export interface SupabaseChatMessage {
  id: string;            // UUID
  group_id: string;      // UUID → groups.group_id
  text: string;
  created_at: string;
  user_id: string;       // UUID → users.user_id
  is_encrypted?: boolean;
  encrypted_messages?: any;
  // Joined field from users table
  users?: { full_name: string } | null;
}

// ============================================================================
// Document Types (maps to `documents` table)
// ============================================================================

export interface SupabaseDocument {
  id: string;            // UUID
  group_id: string;      // UUID → groups.group_id
  name: string;
  file_url: string;
  file_type?: string;
  file_size?: string;
  uploaded_by: string;   // UUID → users.user_id
  created_at: string;
}

// ============================================================================
// UI / Component Types (not directly mapped to DB tables)
// ============================================================================

export interface User {
  id: number;
  username: string;
  role?: string;
}

export interface Group {
  id: string;
  name: string;
  course: string;
  members?: any[];
  member_details?: Array<{ id: string; username: string }>;
  created_at?: string;
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

// ============================================================================
// Tasks & Notes (UI layer)
// ============================================================================

export type TaskStatus = 'completed' | 'in-progress' | 'pending';

export interface TaskNote {
  id: number;
  title: string;
  content: string;
  created_at: string;
  author_name: string;
  status?: 'completed' | 'in-progress' | 'pending';
}

// ============================================================================
// Project Timeline (Gantt Chart)
// ============================================================================

export interface TimelineTask {
  id: number;
  task_name: string;
  start_day: number;
  duration_days: number;
  progress_percentage: number;
  assignee_name: string;
  hex_color: string;
  due_date?: string;
}

// ============================================================================
// Chat & Messaging (UI layer)
// ============================================================================

export interface Message {
  id: number;
  sender_name: string;
  sender_initials: string;
  text: string;
  timestamp: string;
  is_self: boolean;
  avatar_color?: string;
}

// ============================================================================
// Document & File Management (UI layer)
// ============================================================================

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

// ============================================================================
// Analytics
// ============================================================================

export interface MemberBandwidth {
  name: string;
  risk_score: number;
}

export interface GroupAnalytics {
  activity_pulse: number;
  task_velocity: number;
  contribution_balance: number;
  at_risk_status: 'High' | 'Low' | 'Medium';
  tone_analysis: string;
  workload_prediction: number;
  completion_forecast: string;
  milestone_buffer: number;
  member_bandwidth: MemberBandwidth[];
}

// ============================================================================
// Database type helper for Supabase responses
// ============================================================================

export type Database = {
  public: {
    Tables: {
      users: {
        Row: SupabaseUser;
        Insert: Omit<SupabaseUser, 'created_at'>;
        Update: Partial<Omit<SupabaseUser, 'user_id' | 'created_at'>>;
      };
      groups: {
        Row: SupabaseGroup;
        Insert: Omit<SupabaseGroup, 'group_id' | 'created_at'>;
        Update: Partial<Omit<SupabaseGroup, 'group_id' | 'created_at'>>;
      };
      group_members: {
        Row: SupabaseGroupMember;
        Insert: Omit<SupabaseGroupMember, 'joined_at'>;
        Update: never;
      };
      tasks: {
        Row: SupabaseTask;
        Insert: Omit<SupabaseTask, 'id' | 'created_at'>;
        Update: Partial<Omit<SupabaseTask, 'id' | 'created_at'>>;
      };
      submissions: {
        Row: SupabaseSubmission;
        Insert: Omit<SupabaseSubmission, 'id' | 'created_at'>;
        Update: Partial<Omit<SupabaseSubmission, 'id' | 'created_at'>>;
      };
      attachments: {
        Row: SupabaseAttachment;
        Insert: Omit<SupabaseAttachment, 'id' | 'uploaded_at'>;
        Update: never;
      };
      tasknotes: {
        Row: SupabaseTaskNote;
        Insert: Omit<SupabaseTaskNote, 'id' | 'created_at'>;
        Update: Partial<Omit<SupabaseTaskNote, 'id' | 'created_at'>>;
      };
      chat_messages: {
        Row: SupabaseChatMessage;
        Insert: Omit<SupabaseChatMessage, 'id' | 'created_at'>;
        Update: never;
      };
      documents: {
        Row: SupabaseDocument;
        Insert: Omit<SupabaseDocument, 'id' | 'created_at'>;
        Update: Partial<Omit<SupabaseDocument, 'id' | 'created_at'>>;
      };
    };
  };
};
