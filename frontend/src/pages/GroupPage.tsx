import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// Pointing to your Groups component
import { Groups } from '../components/Groups/Groups';
import { NavItem } from '../components/Sidebar/NavItem';
import {
  LayoutDashboard,
  LogOut,
  BookOpen,
  Users,
  HelpCircle,
  Pin,
  PinOff,
} from 'lucide-react';

export default function GroupPage() {
  const [isPinned, setIsPinned] = useState(false);
  const navigate = useNavigate();
  const userRole = localStorage.getItem('user_role') || 'student';

  const handleLogout = () => {
    localStorage.removeItem('user_role');
    localStorage.removeItem('token');
    window.location.href = '/logout';
  };

  return (
    <div className="flex min-h-screen bg-[#F8F9FB]">
      {/* 1. Sidebar Container (Shared Logic) */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-white border-r border-[#E2E8F0] z-30 transition-all duration-300 ease-in-out flex flex-col shadow-xl group
          ${isPinned ? 'w-64' : 'w-20 hover:w-64'}
        `}
      >
        <div className="p-4 flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-10 px-1">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 bg-[#2563EB] rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-100 flex-shrink-0">
                G
              </div>
              <span
                className={`font-bold text-[#1E293B] text-lg tracking-tight whitespace-nowrap transition-opacity duration-300 ${isPinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              >
                {userRole === 'teacher' ? 'Teacher Portal' : 'Student Portal'}
              </span>
            </div>

            <button
              onClick={() => setIsPinned(!isPinned)}
              className={`p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-opacity duration-300 ${isPinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            >
              {isPinned ? (
                <Pin size={16} className="rotate-45 text-[#2563EB]" />
              ) : (
                <PinOff size={16} />
              )}
            </button>
          </div>

          <nav className="space-y-2">
            <NavItem
              icon={<LayoutDashboard size={24} />}
              label="Dashboard"
              isPinned={isPinned}
              onClick={() => navigate('/dashboard')}
            />
            <NavItem
              icon={<BookOpen size={22} />}
              label="Analytics"
              isPinned={isPinned}
            />
            <NavItem
              icon={<Users size={22} />}
              label="Groups"
              active // Keeps it highlighted on this page
              isPinned={isPinned}
              onClick={() => navigate('/groups')} // Redirects to Groups
            />

            <div className="my-2 border-t border-[#E2E8F0] mx-2" />

            <NavItem
              icon={<LogOut size={24} />}
              label="Logout"
              isPinned={isPinned}
              onClick={handleLogout}
              className="hover:text-red-600 group-hover/item:text-red-600"
            />
          </nav>
        </div>

        {/* User Profile Card */}
        <div className="p-4 border-t border-[#E2E8F0] space-y-4">
          <div className="flex items-center gap-3 p-2 pl-0.5 bg-white rounded-2xl border border-[#E2E8F0] shadow-sm cursor-pointer">
            <div className="w-10 h-10 bg-gradient-to-tr from-[#2563EB] to-[#60A5FA] rounded-full flex items-center justify-center text-white font-bold border-2 border-white shadow-sm flex-shrink-0">
              JD
            </div>
            <div
              className={`overflow-hidden transition-opacity duration-300 whitespace-nowrap ${isPinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            >
              <p className="text-sm font-bold text-[#1E293B] truncate">
                John Doe
              </p>
              <p className="text-[11px] text-[#64748B] font-semibold">
                ID: 2024001
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isPinned ? 'ml-64' : 'ml-20'}`}
      >
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-[#E2E8F0] flex items-center px-10 sticky top-0 z-20">
          <h1 className="text-2xl font-extrabold text-[#1E293B] tracking-tight">
            Collaboration Groups
          </h1>
        </header>

        <main className="flex-1 overflow-hidden">
          {/* We use h-full here because the Groups component handles its own scrolling */}
          <div className="h-[calc(100vh-5rem)]">
            <Groups />
          </div>
        </main>
      </div>

      <button className="fixed bottom-8 right-8 w-14 h-14 bg-[#1E293B] text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all z-50">
        <HelpCircle size={28} />
      </button>
    </div>
  );
}
