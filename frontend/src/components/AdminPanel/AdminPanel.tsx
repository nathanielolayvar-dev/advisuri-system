import {
  Shield,
  Users,
  Settings,
  Bell,
  FileText,
  Calendar,
  UserPlus,
  Trash2,
  Download,
  Send,
  Clock,
  CheckCircle,
  AlertTriangle,
  Search,
  Filter,
  Plus,
  Mail,
  MessageSquare,
  Lock,
  Unlock,
  UserCheck,
  ClipboardList,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { updateUserRole } from '../../services/userService';

// ============================================================================
// Types (Updated to match new DB Schema)
// ============================================================================

type UserRole = 'admin' | 'teacher' | 'student';

interface AdminUser {
  user_id: string;
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  status: string; // Added from Step 1 ('Active', 'Suspended')
  last_login: string | null; // Added from Step 1
  created_at: string;
  profile_picture_url?: string | null;
}

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  resource: string;
  status: string; // 'Success' | 'Failed'
  timestamp: string;
  users?: { full_name: string } | null; // Joined from users
}

interface Schedule {
  id: string;
  teacher_id: string;
  subject: string;
  classroom: string;
  day_of_week: string;
  start_time: string; // Updated from new schema
  end_time: string;   // Updated from new schema
  student_capacity: number; // Updated from new schema
  users?: { full_name: string } | null;
}

interface Notification {
  id: string;
  notification_type: 'Emergency' | 'Announcement' | 'Newsletter'; // Updated
  subject: string; // Updated from title
  message: string;
  recipient_count: number;
  delivery_method: string; // Updated from channel
  status: string;
  sent_at: string; // Updated from created_at
  users?: { full_name: string } | null;
}

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  teacherCount: number;
  studentCount: number;
  suspendedCount: number;
  classCount: number; // Replaced groupCount
}

// ============================================================================
// Main Component
// ============================================================================

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'users' | 'notifications' | 'audit' | 'schedule' | 'reports'>('users');

  // Data state
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    teacherCount: 0,
    studentCount: 0,
    suspendedCount: 0,
    classCount: 0,
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [newRole, setNewRole] = useState<'admin' | 'teacher' | 'student'>('student');
  const [roleUpdating, setRoleUpdating] = useState(false);

  // Notification form state
  const [notifType, setNotifType] = useState<'Emergency' | 'Announcement' | 'Newsletter'>('Announcement');
  const [notifSubject, setNotifSubject] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifSending, setNotifSending] = useState(false);

  // Helper to log audit events directly into the new table
  const logAuditAction = async (action: string, resource: string, status: string = 'Success') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get the current user's full name for more detailed logging
      let performedBy = 'System';
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('full_name')
          .eq('user_id', user.id)
          .single();
        performedBy = userData?.full_name || user.email || 'Admin';
      }
      
      const { error } = await supabase.from('audit_logs').insert({
        user_id: user?.id,
        action: action,
        resource: resource,
        status: status
      });
      
      if (error) {
        console.error('Failed to log audit action:', error);
      }
    } catch (err) {
      console.error('Error logging audit action:', err);
    }
  };

  // ============================================================================
  // Data Fetching
  // ============================================================================

  const fetchStats = useCallback(async () => {
    const [usersRes, scheduleRes] = await Promise.all([
      supabase.from('users').select('user_id, role, status, is_active'),
      supabase.from('master_schedule').select('id', { count: 'exact', head: true }),
    ]);

    if (usersRes.data) {
      const all = usersRes.data;
      setStats({
        totalUsers: all.length,
        activeUsers: all.filter((u: any) => u.status === 'Active' || u.is_active).length,
        teacherCount: all.filter((u: any) => u.role === 'teacher').length,
        studentCount: all.filter((u: any) => u.role === 'student').length,
        suspendedCount: all.filter((u: any) => u.status === 'Suspended').length,
        classCount: scheduleRes.count || 0,
      });
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('user_id, full_name, email, role, is_active, status, last_login, created_at, profile_picture_url')
      .order('created_at', { ascending: false });

    if (!error && data) setUsers(data as AdminUser[]);
    setLoading(false);
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*, users ( full_name )')
      .order('timestamp', { ascending: false })
      .limit(50);

    if (!error && data) setAuditLogs(data as AuditLog[]);
    setLoading(false);
  }, []);

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('master_schedule')
      .select('*, users ( full_name )')
      .order('day_of_week', { ascending: true });

    if (!error && data) setSchedules(data as Schedule[]);
    setLoading(false);
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('system_notifications')
      .select('*, users ( full_name )')
      .order('sent_at', { ascending: false })
      .limit(20);

    if (!error && data) setNotifications(data as Notification[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'audit') fetchAuditLogs();
    if (activeTab === 'schedule') fetchSchedules();
    if (activeTab === 'notifications') fetchNotifications();
  }, [activeTab, fetchStats, fetchUsers, fetchAuditLogs, fetchSchedules, fetchNotifications]);

  // ============================================================================
  // Actions
  // ============================================================================

  const handleToggleUserStatus = async (userId: string, currentStatus: string, currentIsActive: boolean, userName: string) => {
    const newStatus = (currentStatus === 'Active' || currentIsActive) ? 'Suspended' : 'Active';
    
    const { error } = await supabase
      .from('users')
      .update({ status: newStatus, is_active: newStatus === 'Active' })
      .eq('user_id', userId);

    if (!error) {
      setUsers(prev => prev.map(u =>
        u.user_id === userId ? { ...u, status: newStatus, is_active: newStatus === 'Active' } : u
      ));
      
      await logAuditAction(`Changed user status to ${newStatus}`, `User: ${userName}`);
      fetchStats();
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${userName}? This cannot be undone.`)) return;

    const { error } = await supabase.from('users').delete().eq('user_id', userId);

    if (!error) {
      setUsers(prev => prev.filter(u => u.user_id !== userId));
      await logAuditAction('Deleted user', `User: ${userName}`);
      fetchStats();
    }
  };

  const handleOpenRoleModal = (user: AdminUser) => {
    setSelectedUser(user);
    setNewRole(user.role || 'student');
    setShowRoleModal(true);
  };

  const handleChangeUserRole = async () => {
    if (!selectedUser) return;
    setRoleUpdating(true);

    console.log('Changing role for user:', selectedUser.user_id, 'to', newRole);
    
    const result = await updateUserRole(selectedUser.user_id, newRole);
    console.log('Role update result:', result);

    if (!result.error && result.data) {
      setUsers(prev => prev.map(u =>
        u.user_id === selectedUser.user_id ? { ...u, role: newRole } : u
      ));
      
      // Get current admin's name for detailed logging
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      let adminName = 'Admin';
      if (currentUser) {
        const { data: adminData } = await supabase
          .from('users')
          .select('full_name')
          .eq('user_id', currentUser.id)
          .single();
        adminName = adminData?.full_name || currentUser.email || 'Admin';
      }
      
      console.log('Logging audit action - Admin:', adminName, 'changed', selectedUser.full_name, 'to', newRole);
      
      await logAuditAction(
        `Changed role from ${selectedUser.role || 'student'} to ${newRole}`,
        `User: ${selectedUser.full_name} (${selectedUser.email}) | Performed by: ${adminName}`
      );
      setShowRoleModal(false);
      setSelectedUser(null);
      fetchStats();
    } else {
      console.error('Failed to update role:', result.error);
      alert('Failed to update role: ' + (result.error?.message || 'Unknown error'));
    }
    setRoleUpdating(false);
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifSubject.trim() || !notifMessage.trim()) return;
    setNotifSending(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setNotifSending(false); return; }

    const { error } = await supabase.from('system_notifications').insert([{
      notification_type: notifType,
      subject: notifSubject.trim(),
      message: notifMessage.trim(),
      sent_by: user.id,
      delivery_method: 'Email + In-App',
      recipient_count: stats.totalUsers,
      status: 'Sent'
    }]);

    if (!error) {
      await logAuditAction('Sent mass notification', `${notifType}: ${notifSubject}`);
      setNotifSubject('');
      setNotifMessage('');
      setShowNotificationModal(false);
      fetchNotifications();
    }
    setNotifSending(false);
  };

  const handleDeleteSchedule = async (scheduleId: string, subject: string) => {
    if (!window.confirm('Delete this schedule slot?')) return;
    
    const { error } = await supabase.from('master_schedule').delete().eq('id', scheduleId);
    if (!error) {
      setSchedules(prev => prev.filter(s => s.id !== scheduleId));
      await logAuditAction('Deleted schedule block', `Subject: ${subject}`);
      fetchStats();
    }
  };

  // ============================================================================
  // Filtered users
  // ============================================================================

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  // Helper for Profile Picture Generation
  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#1E293B]">Admin Control Panel</h2>
          <p className="text-[#64748B] mt-1">Comprehensive system management and administration</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right bg-white rounded-lg px-4 py-2 border border-[#E2E8F0] shadow-sm">
            <p className="text-sm text-[#64748B] font-medium">System Status</p>
            <p className="text-base font-bold text-[#10B981] flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> All Systems Operational
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        {[
          { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'from-[#DBEAFE] to-[#BFDBFE]', iconColor: 'text-[#2563EB]', textColor: 'text-[#1E293B]' },
          { label: 'Active Now', value: stats.activeUsers, icon: UserCheck, color: 'from-[#D1FAE5] to-[#A7F3D0]', iconColor: 'text-[#10B981]', textColor: 'text-[#10B981]' },
          { label: 'Teachers', value: stats.teacherCount, icon: Shield, color: 'from-[#FEF3C7] to-[#FDE68A]', iconColor: 'text-[#F59E0B]', textColor: 'text-[#1E293B]' },
          { label: 'Students', value: stats.studentCount, icon: Users, color: 'from-[#E9D5FF] to-[#DDD6FE]', iconColor: 'text-[#8B5CF6]', textColor: 'text-[#1E293B]' },
          { label: 'Suspended', value: stats.suspendedCount, icon: AlertTriangle, color: 'from-[#FEE2E2] to-[#FECACA]', iconColor: 'text-[#DC2626]', textColor: 'text-[#DC2626]' },
          { label: 'Classes', value: stats.classCount, icon: Calendar, color: 'from-[#DBEAFE] to-[#BFDBFE]', iconColor: 'text-[#2563EB]', textColor: 'text-[#1E293B]' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-lg shadow-sm border border-[#E2E8F0] p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 bg-gradient-to-br ${stat.color} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${stat.iconColor}`} />
                </div>
                <div>
                  <p className="text-sm text-[#64748B] font-medium">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.textColor}`}>{stat.value.toLocaleString()}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-[#E2E8F0] overflow-hidden">
        <div className="flex border-b border-[#E2E8F0] overflow-x-auto">
          {[
            { id: 'users', label: 'User Management', icon: Users },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'audit', label: 'Audit Logs', icon: FileText },
            { id: 'schedule', label: 'Scheduling', icon: Calendar },
            { id: 'reports', label: 'Reports', icon: ClipboardList },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-4 font-semibold text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-[#2563EB] text-[#2563EB] bg-[#F8FAFC]'
                    : 'text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAFC]'
                }`}
              >
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6">

          {/* ================================================================
              USER MANAGEMENT TAB
          ================================================================ */}
          {activeTab === 'users' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                    <input
                      type="text"
                      placeholder="Search users by name or email..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] w-80"
                    />
                  </div>
                  <button onClick={fetchUsers} className="flex items-center gap-2 px-4 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm font-medium text-[#64748B] hover:bg-white transition-colors">
                    <RefreshCw className="w-4 h-4" /> Refresh
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
                  <span className="ml-2 text-[#64748B]">Loading users...</span>
                </div>
              ) : (
                <div className="border border-[#E2E8F0] rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider">Last Login</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-[#64748B] uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-[#E2E8F0]">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-[#64748B]">
                            {userSearch ? 'No users match your search.' : 'No users found.'}
                          </td>
                        </tr>
                      ) : filteredUsers.map((user) => (
                        <tr key={user.user_id} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] rounded-full flex items-center justify-center shadow-sm">
                                <span className="text-white font-semibold text-xs">
                                  {getInitials(user.full_name)}
                                </span>
                              </div>
                              <span className="font-semibold text-[#1E293B]">{user.full_name || 'Unknown User'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-[#64748B]">{user.email}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                              user.role === 'admin' ? 'bg-[#FEE2E2] text-[#DC2626]' :
                              (user.role === 'teacher') ? 'bg-[#DBEAFE] text-[#2563EB]' :
                              'bg-[#D1FAE5] text-[#10B981]'
                            }`}>
                              {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Student'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                              (user.status === 'Active' || user.is_active) ? 'bg-[#D1FAE5] text-[#10B981]' : 
                              user.status === 'Suspended' ? 'bg-[#FEE2E2] text-[#DC2626]' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {user.status || (user.is_active ? 'Active' : 'Pending')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-[#64748B]">
                            {user.last_login ? new Date(user.last_login).toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Never logged in'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenRoleModal(user)}
                                className="p-2 hover:bg-[#F8FAFC] rounded-lg transition-colors"
                                title="Change user role"
                              >
                                <Shield className="w-4 h-4 text-[#2563EB]" />
                              </button>
                              <button
                                onClick={() => handleToggleUserStatus(user.user_id, user.status, user.is_active, user.full_name)}
                                className="p-2 hover:bg-[#F8FAFC] rounded-lg transition-colors"
                                title={user.status === 'Active' || user.is_active ? 'Suspend user' : 'Activate user'}
                              >
                                {user.status === 'Active' || user.is_active
                                  ? <Lock className="w-4 h-4 text-[#F59E0B]" />
                                  : <Unlock className="w-4 h-4 text-[#10B981]" />
                                }
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.user_id, user.full_name)}
                                className="p-2 hover:bg-[#F8FAFC] rounded-lg transition-colors"
                                title="Delete user"
                              >
                                <Trash2 className="w-4 h-4 text-[#DC2626]" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ================================================================
              NOTIFICATIONS TAB (Updated for `system_notifications`)
          ================================================================ */}
          {activeTab === 'notifications' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#64748B]">Send mass notifications via email, SMS, or in-app alerts</p>
                <button
                  onClick={() => setShowNotificationModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white rounded-lg font-semibold text-sm hover:shadow-md transition-shadow"
                >
                  <Send className="w-4 h-4" />
                  Send Notification
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { type: 'Emergency', label: 'Emergency Alert', desc: 'Send urgent notifications to all users immediately', color: 'from-[#FEE2E2] to-[#FECACA]', border: 'border-[#DC2626]', btnColor: 'bg-[#DC2626] hover:bg-[#B91C1C]', icon: AlertTriangle, iconColor: 'text-[#DC2626]' },
                  { type: 'Announcement', label: 'General Announcement', desc: 'Share news, updates, and general information', color: 'from-[#DBEAFE] to-[#BFDBFE]', border: 'border-[#2563EB]', btnColor: 'bg-[#2563EB] hover:bg-[#1D4ED8]', icon: Bell, iconColor: 'text-[#2563EB]' },
                  { type: 'Newsletter', label: 'Newsletter', desc: 'Send scheduled newsletters and updates', color: 'from-[#FEF3C7] to-[#FDE68A]', border: 'border-[#F59E0B]', btnColor: 'bg-[#F59E0B] hover:bg-[#D97706]', icon: Mail, iconColor: 'text-[#F59E0B]' },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.type} className={`bg-gradient-to-br ${item.color} rounded-lg p-5 border-2 ${item.border} shadow-md`}>
                      <div className="flex items-center gap-3 mb-3">
                        <Icon className={`w-6 h-6 ${item.iconColor}`} />
                        <h3 className="font-bold text-[#1E293B]">{item.label}</h3>
                      </div>
                      <p className="text-sm text-[#64748B] mb-4">{item.desc}</p>
                      <button
                        onClick={() => { setNotifType(item.type as any); setShowNotificationModal(true); }}
                        className={`w-full px-4 py-2 ${item.btnColor} text-white rounded-lg font-semibold text-sm transition-colors`}
                      >
                        Send {item.label}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="bg-white border border-[#E2E8F0] rounded-lg p-5">
                <h3 className="font-bold text-[#1E293B] mb-4">Recent Notifications</h3>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-[#2563EB]" />
                  </div>
                ) : notifications.length === 0 ? (
                  <p className="text-center text-[#64748B] py-8">No notifications sent yet.</p>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((notif) => (
                      <div key={notif.id} className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                        <div className="flex items-center gap-4">
                          <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                            notif.notification_type === 'Emergency' ? 'bg-[#FEE2E2] text-[#DC2626]' :
                            notif.notification_type === 'Announcement' ? 'bg-[#DBEAFE] text-[#2563EB]' :
                            'bg-[#FEF3C7] text-[#F59E0B]'
                          }`}>
                            {notif.notification_type}
                          </div>
                          <div>
                            <p className="font-semibold text-[#1E293B]">{notif.subject}</p>
                            <p className="text-sm text-[#64748B]">
                              Sent: {new Date(notif.sent_at).toLocaleString()} •{' '}
                              {notif.recipient_count} recipients •{' '}
                              {notif.delivery_method}
                            </p>
                          </div>
                        </div>
                        <CheckCircle className="w-5 h-5 text-[#10B981]" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================
              AUDIT LOGS TAB (Updated for `audit_logs` table)
          ================================================================ */}
          {activeTab === 'audit' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#64748B]">Monitor system activity and track user actions</p>
                <div className="flex items-center gap-2">
                  <button onClick={fetchAuditLogs} className="flex items-center gap-2 px-4 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm font-medium text-[#64748B] hover:bg-white transition-colors">
                    <RefreshCw className="w-4 h-4" /> Refresh
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white border border-[#E2E8F0] rounded-lg p-4">
                  <p className="text-sm text-[#64748B] mb-1">Total Events</p>
                  <p className="text-2xl font-bold text-[#1E293B]">{auditLogs.length}</p>
                </div>
                <div className="bg-white border border-[#E2E8F0] rounded-lg p-4">
                  <p className="text-sm text-[#64748B] mb-1">Today</p>
                  <p className="text-2xl font-bold text-[#2563EB]">
                    {auditLogs.filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString()).length}
                  </p>
                </div>
                <div className="bg-white border border-[#E2E8F0] rounded-lg p-4">
                  <p className="text-sm text-[#64748B] mb-1">Failed Actions</p>
                  <p className="text-2xl font-bold text-[#DC2626]">
                    {auditLogs.filter(l => l.status.toLowerCase() === 'failed').length}
                  </p>
                </div>
                <div className="bg-white border border-[#E2E8F0] rounded-lg p-4">
                  <p className="text-sm text-[#64748B] mb-1">Success Rate</p>
                  <p className="text-2xl font-bold text-[#10B981]">
                    {auditLogs.length > 0
                      ? `${Math.round((auditLogs.filter(l => l.status.toLowerCase() === 'success').length / auditLogs.length) * 100)}%`
                      : '—'}
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
                </div>
              ) : (
                <div className="border border-[#E2E8F0] rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider">Action</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider">Resource</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider">Timestamp</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-[#E2E8F0]">
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-[#64748B]">No audit logs yet.</td>
                        </tr>
                      ) : auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-[#1E293B]">{log.users?.full_name || 'System / Unknown'}</td>
                          <td className="px-6 py-4 text-sm text-[#64748B]">{log.action}</td>
                          <td className="px-6 py-4 text-sm text-[#64748B]">{log.resource}</td>
                          <td className="px-6 py-4 text-sm text-[#64748B]">{new Date(log.timestamp).toLocaleString()}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                              log.status.toLowerCase() === 'success' ? 'bg-[#D1FAE5] text-[#10B981]' : 'bg-[#FEE2E2] text-[#DC2626]'
                            }`}>
                              {log.status.toLowerCase() === 'success'
                                ? <CheckCircle className="w-3 h-3" />
                                : <AlertTriangle className="w-3 h-3" />}
                              {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ================================================================
              SCHEDULING TAB (Updated for `master_schedule` table)
          ================================================================ */}
          {activeTab === 'schedule' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#64748B]">Manage master schedule and prevent classroom conflicts</p>
                <button
                  onClick={() => setShowScheduleModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white rounded-lg font-semibold text-sm hover:shadow-md transition-shadow"
                >
                  <Plus className="w-4 h-4" /> Add Schedule
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-[#E2E8F0] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-[#2563EB]" />
                    <p className="text-sm text-[#64748B] font-medium">Total Classes</p>
                  </div>
                  <p className="text-2xl font-bold text-[#1E293B]">{schedules.length}</p>
                </div>
                <div className="bg-white border border-[#E2E8F0] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-[#10B981]" />
                    <p className="text-sm text-[#64748B] font-medium">Teachers Assigned</p>
                  </div>
                  <p className="text-2xl font-bold text-[#1E293B]">
                    {new Set(schedules.map(s => s.teacher_id)).size}
                  </p>
                </div>
                <div className="bg-white border border-[#E2E8F0] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-[#DC2626]" />
                    <p className="text-sm text-[#64748B] font-medium">Conflicts</p>
                  </div>
                  <p className="text-2xl font-bold text-[#DC2626]">0</p>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
                </div>
              ) : (
                <div className="border border-[#E2E8F0] rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider">Teacher</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider">Subject</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider">Classroom</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider">Day</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider">Time</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider">Capacity</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-[#64748B] uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-[#E2E8F0]">
                      {schedules.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-[#64748B]">No schedules yet. Click "Add Schedule" to create one.</td>
                        </tr>
                      ) : schedules.map((slot) => (
                        <tr key={slot.id} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-[#1E293B]">
                            {slot.users?.full_name || 'Unknown Teacher'}
                          </td>
                          <td className="px-6 py-4 text-sm text-[#64748B]">{slot.subject}</td>
                          <td className="px-6 py-4 text-sm text-[#64748B]">{slot.classroom}</td>
                          <td className="px-6 py-4 text-sm text-[#64748B]">{slot.day_of_week}</td>
                          <td className="px-6 py-4 text-sm text-[#64748B] font-mono">
                            {slot.start_time.slice(0,5)} – {slot.end_time.slice(0,5)}
                          </td>
                          <td className="px-6 py-4 text-sm text-[#64748B]">{slot.student_capacity}</td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleDeleteSchedule(slot.id, slot.subject)}
                              className="p-2 hover:bg-[#F8FAFC] rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-[#DC2626]" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ================================================================
              REPORTS TAB
          ================================================================ */}
          {activeTab === 'reports' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#64748B]">Generate official documents and compliance reports</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                  { label: 'Transcripts', desc: 'Generate official academic transcripts for students', color: 'from-[#DBEAFE] to-[#BFDBFE]', iconColor: 'text-[#2563EB]', btnColor: 'bg-[#2563EB] hover:bg-[#1D4ED8]', icon: FileText },
                  { label: 'Report Cards', desc: 'Create semester and annual report cards', color: 'from-[#D1FAE5] to-[#A7F3D0]', iconColor: 'text-[#10B981]', btnColor: 'bg-[#10B981] hover:bg-[#059669]', icon: ClipboardList },
                  { label: 'Compliance', desc: 'Government and regulatory compliance reports', color: 'from-[#FEF3C7] to-[#FDE68A]', iconColor: 'text-[#F59E0B]', btnColor: 'bg-[#F59E0B] hover:bg-[#D97706]', icon: Shield },
                  { label: 'Attendance', desc: 'Comprehensive attendance reports and analytics', color: 'from-[#E9D5FF] to-[#DDD6FE]', iconColor: 'text-[#8B5CF6]', btnColor: 'bg-[#8B5CF6] hover:bg-[#7C3AED]', icon: Users },
                  { label: 'Performance', desc: 'Student and teacher performance analytics', color: 'from-[#FECACA] to-[#FCA5A5]', iconColor: 'text-[#DC2626]', btnColor: 'bg-[#DC2626] hover:bg-[#B91C1C]', icon: Clock },
                  { label: 'Custom Reports', desc: 'Build custom reports with advanced filters', color: 'from-[#BFDBFE] to-[#93C5FD]', iconColor: 'text-[#2563EB]', btnColor: 'bg-[#64748B] hover:bg-[#475569]', icon: Calendar },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="bg-white border-2 border-[#E2E8F0] rounded-lg p-6 hover:shadow-lg transition-shadow">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-12 h-12 bg-gradient-to-br ${item.color} rounded-lg flex items-center justify-center`}>
                          <Icon className={`w-6 h-6 ${item.iconColor}`} />
                        </div>
                        <h3 className="text-lg font-bold text-[#1E293B]">{item.label}</h3>
                      </div>
                      <p className="text-sm text-[#64748B] mb-4">{item.desc}</p>
                      <button className={`w-full flex items-center justify-center gap-2 px-4 py-2 ${item.btnColor} text-white rounded-lg font-semibold text-sm transition-colors`}>
                        <Download className="w-4 h-4" /> Generate {item.label}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================
          SEND NOTIFICATION MODAL
      ================================================================ */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-[#1E293B] mb-4">Send Notification</h3>
            <form onSubmit={handleSendNotification} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Type</label>
                <select
                  value={notifType}
                  onChange={(e) => setNotifType(e.target.value as any)}
                  className="mt-1 w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                >
                  <option value="Announcement">Announcement</option>
                  <option value="Emergency">Emergency Alert</option>
                  <option value="Newsletter">Newsletter</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Subject</label>
                <input
                  type="text"
                  required
                  value={notifSubject}
                  onChange={(e) => setNotifSubject(e.target.value)}
                  placeholder="Notification subject..."
                  className="mt-1 w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Message</label>
                <textarea
                  required
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  placeholder="Notification message..."
                  rows={4}
                  className="mt-1 w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNotificationModal(false)}
                  className="flex-1 px-4 py-2 border border-[#E2E8F0] rounded-lg text-sm font-medium text-[#64748B] hover:bg-[#F8FAFC] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={notifSending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#2563EB] text-white rounded-lg text-sm font-semibold hover:bg-[#1D4ED8] transition-colors disabled:opacity-50"
                >
                  {notifSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {notifSending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Change Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] px-6 py-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Change User Role
              </h3>
              <p className="text-blue-100 text-sm mt-1">Update the role for {selectedUser.full_name}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-2">Current Role</label>
                <div className="px-4 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[#1E293B] font-medium">
                  {selectedUser.role ? selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1) : 'Student'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-2">New Role</label>
                <div className="space-y-2">
                  {(['admin', 'teacher', 'student'] as const).map((role) => (
                    <label
                      key={role}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                        newRole === role
                          ? 'border-[#2563EB] bg-blue-50'
                          : 'border-[#E2E8F0] hover:border-[#94A3B8]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={role}
                        checked={newRole === role}
                        onChange={(e) => setNewRole(e.target.value as 'admin' | 'teacher' | 'student')}
                        className="w-4 h-4 text-[#2563EB] border-[#CBD5E1] focus:ring-[#2563EB]"
                      />
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          role === 'admin' ? 'bg-[#FEE2E2]' :
                          role === 'teacher' ? 'bg-[#DBEAFE]' :
                          'bg-[#D1FAE5]'
                        }`}>
                          <Shield className={`w-4 h-4 ${
                            role === 'admin' ? 'text-[#DC2626]' :
                            role === 'teacher' ? 'text-[#2563EB]' :
                            'text-[#10B981]'
                          }`} />
                        </div>
                        <span className="font-medium text-[#1E293B] capitalize">{role}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              {newRole !== selectedUser.role && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700">
                    You are about to change this user's role from <strong>{selectedUser.role || 'student'}</strong> to <strong>{newRole}</strong>.
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-3 px-6 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedUser(null);
                }}
                className="flex-1 px-4 py-2 border border-[#E2E8F0] rounded-lg text-sm font-medium text-[#64748B] hover:bg-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleChangeUserRole}
                disabled={roleUpdating || newRole === selectedUser.role}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#2563EB] text-white rounded-lg text-sm font-semibold hover:bg-[#1D4ED8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {roleUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                {roleUpdating ? 'Updating...' : 'Update Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}