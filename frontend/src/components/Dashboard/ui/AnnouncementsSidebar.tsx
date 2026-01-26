// components/Dashboard/AnnouncementsSidebar.tsx
import { Bell } from 'lucide-react';

interface Announcement {
  id: number;
  title: string;
  group: string;
  author: string;
  content: string;
  time: string;
  avatar: string;
  isNew: boolean;
}

interface AnnouncementsSidebarProps {
  announcements: Announcement[];
}

export const AnnouncementsSidebar = ({
  announcements,
}: AnnouncementsSidebarProps) => {
  // Helper to assign colors based on the author's initials
  const getAvatarColor = (index: number) => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'];
    return colors[index % colors.length];
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-[#E2E8F0] sticky top-20">
      <div className="p-5 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gradient-to-br from-[#DBEAFE] to-[#BFDBFE] rounded-lg flex items-center justify-center">
            <Bell className="w-5 h-5 text-[#2563EB]" />
          </div>
          <h3 className="text-lg font-bold text-[#1E293B]">
            Group Announcements
          </h3>
        </div>
      </div>

      <div className="divide-y divide-[#E2E8F0] max-h-[600px] overflow-y-auto custom-scrollbar">
        {announcements.map((announcement, index) => (
          <div
            key={announcement.id}
            className="p-4 hover:bg-[#F8FAFC] transition-colors"
          >
            <div className="flex items-start gap-3 mb-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm shadow-sm"
                style={{ backgroundColor: getAvatarColor(index) }}
              >
                {announcement.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-1">
                  <h4 className="font-semibold text-[#1E293B] text-sm truncate">
                    {announcement.title}
                  </h4>
                  {announcement.isNew && (
                    <span className="bg-[#2563EB] text-white text-[10px] px-2 py-0.5 rounded-full font-bold ml-2 flex-shrink-0">
                      NEW
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#2563EB] font-medium mb-1">
                  {announcement.group}
                </p>
                <p className="text-xs text-[#64748B]">
                  by {announcement.author}
                </p>
              </div>
            </div>
            <p className="text-sm text-[#475569] mb-2 leading-relaxed line-clamp-3">
              {announcement.content}
            </p>
            <p className="text-[11px] text-[#94A3B8] font-medium">
              {announcement.time}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
