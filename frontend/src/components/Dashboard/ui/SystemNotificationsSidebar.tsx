import { Bell } from 'lucide-react';
import { SystemNotification } from '../../../shared/types';

interface SystemNotificationsSidebarProps {
  notifications: SystemNotification[];
  onDismiss?: (id: string) => void;
  onMarkAllRead?: () => void;
  isSticky?: boolean;
  unreadCount?: number;
  showReadToggle?: boolean;
  showRead?: boolean;
  onToggleShowRead?: () => void;
  readCount?: number;
  readIds?: string[];
  onClearReadHistory?: () => void;
}

const notificationTypeStyles: Record<string, { bg: string; text: string }> = {
  emergency: { bg: 'bg-red-50', text: 'text-red-700' },
  announcement: { bg: 'bg-blue-50', text: 'text-blue-700' },
  newsletter: { bg: 'bg-amber-50', text: 'text-amber-700' },
  // Fallback for any other types
  default: { bg: 'bg-slate-50', text: 'text-slate-600' },
};

const getTypeStyles = (type?: string) => {
  const key = (type || '').toLowerCase();
  return notificationTypeStyles[key] ?? notificationTypeStyles.default;
};

export const SystemNotificationsSidebar = ({
  notifications,
  onDismiss,
  onMarkAllRead,
  isSticky = true,
  unreadCount,
  showReadToggle,
  showRead,
  onToggleShowRead,
  readCount,
  readIds,
  onClearReadHistory,
}: SystemNotificationsSidebarProps) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-[#E2E8F0] ${isSticky ? 'lg:sticky lg:top-20' : ''}`}>
      <div className="p-5 border-b border-[#E2E8F0]">
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-[#F3F4FF] to-[#E0E7FF] rounded-lg flex items-center justify-center">
              <Bell className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1E293B]">System Notifications</h3>
              {typeof unreadCount === 'number' && unreadCount > 0 && (
                <span className="text-xs text-red-500 font-semibold">
                  {unreadCount} unread
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onMarkAllRead && notifications.length > 0 && (
              <button
                className="text-xs text-slate-500 hover:text-slate-700 font-semibold"
                onClick={onMarkAllRead}
              >
                Mark all read
              </button>
            )}
            {showReadToggle && onToggleShowRead && (
              <button
                className="text-xs text-slate-500 hover:text-slate-700 font-semibold"
                onClick={onToggleShowRead}
              >
                {showRead ? 'Hide read' : `Show read (${readCount || 0})`}
              </button>
            )}
            {showRead && onClearReadHistory && (
              <button
                className="text-xs text-slate-500 hover:text-slate-700 font-semibold"
                onClick={onClearReadHistory}
              >
                Clear read
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="divide-y divide-[#E2E8F0] max-h-[500px] overflow-y-auto custom-scrollbar">
        {notifications.length === 0 ? (
          <div className="p-5 text-sm text-slate-500 text-center">
            No system notifications yet.
          </div>
        ) : (
          notifications.map((notification) => {
            const typeStyles = getTypeStyles(notification.notification_type);
            const isRead = readIds?.includes(notification.id);
            return (
              <div
                key={notification.id}
                className={`p-4 hover:bg-[#F8FAFC] transition-colors ${isRead ? 'opacity-70' : ''}`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-[#1E293B] truncate">
                        {notification.subject}
                      </h4>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${typeStyles.bg} ${typeStyles.text}`}
                      >
                        {notification.notification_type}
                      </span>
                      {isRead && (
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          Read
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(notification.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    {onDismiss && (
                      <button
                        className="text-[11px] text-slate-500 hover:text-slate-700"
                        onClick={() => onDismiss(notification.id)}
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-[#475569] leading-relaxed line-clamp-3">
                  {notification.message}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
