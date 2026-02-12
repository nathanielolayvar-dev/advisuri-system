import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { NavItem } from './NavItem';
import { useSidebar } from './SidebarContext';
import {
  LayoutDashboard,
  LogOut,
  BookOpen,
  Users,
  Pin,
  PinOff,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  // Pulling shared data and state from Context
  const { isPinned, togglePin, setHovered, isHovered, userData, loading } = useSidebar();
  
  const navigate = useNavigate();
  const location = useLocation();

  // Helper function to get initials from the username/full name
  const getInitials = (name: string | undefined) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = () => {
    localStorage.clear(); // Clear all auth data
    window.location.href = '/logout';
  };

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  // Sidebar is expanded when pinned OR hovered
  const isExpanded = isPinned || isHovered;

  // Determine role for UI labels
  const userRole = userData?.role || 'Student';

  return (
    <aside
      onMouseEnter={() => !isPinned && setHovered(true)}
      onMouseLeave={() => !isPinned && setHovered(false)}
      className={`fixed left-0 top-0 h-screen bg-white border-r border-[#E2E8F0] z-30 transition-all duration-300 ease-out flex flex-col shadow-xl
        ${isExpanded ? 'w-64' : 'w-20'}
      `}
    >
      <div className="p-4 flex-1 flex flex-col overflow-hidden">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-10 px-1">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-[#2563EB] rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-100 flex-shrink-0">
              {userRole === 'Teacher' ? 'T' : 'S'}
            </div>
            <span className={`font-bold text-[#1E293B] text-lg tracking-tight whitespace-nowrap transition-all duration-300
              ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'}
            `}>
              {userRole} Portal
            </span>
          </div>

          {/* Pin button - Only shows when expanded */}
          <button
            onClick={togglePin}
            className={`p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-all duration-300 
              ${isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            title={isPinned ? 'Unpin Sidebar' : 'Pin Sidebar'}
          >
            {isPinned ? (
              <Pin size={16} className="rotate-45 text-[#2563EB]" />
            ) : (
              <PinOff size={16} />
            )}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-2">
          <NavItem
            icon={<LayoutDashboard size={24} />}
            label="Dashboard"
            isPinned={isExpanded}
            active={isActive('/dashboard')}
            onClick={() => navigate('/dashboard')}
          />
          <NavItem
            icon={<BookOpen size={22} />}
            label="Analytics"
            isPinned={isExpanded}
            active={isActive('/analytics')}
            onClick={() => navigate('/analytics')}
          />
          <NavItem
            icon={<Users size={22} />}
            label="Groups"
            isPinned={isExpanded}
            active={isActive('/groups')}
            onClick={() => navigate('/groups')}
          />
          
          <div className={`my-2 border-t border-[#E2E8F0] ${isExpanded ? '' : 'mx-2'}`} />
          
          <NavItem
            icon={<LogOut size={24} />}
            label="Logout"
            isPinned={isExpanded}
            onClick={handleLogout}
            className="hover:text-red-600"
          />
        </nav>
      </div>

      {/* Footer Section */}
      <div className={`p-4 border-t border-[#E2E8F0] flex flex-col gap-3 bg-gray-50/50 transition-all duration-300
        ${isExpanded ? 'items-stretch' : 'items-center'}
      `}>
        {/* Role Badge */}
        <div className={`transition-all duration-300 ${isExpanded ? 'opacity-100 h-6' : 'opacity-0 h-0 overflow-hidden'}`}>
          <span className="inline-block px-3 py-1 bg-blue-50 text-[#2563EB] text-[10px] font-bold rounded-full uppercase tracking-wider border border-blue-100">
            {userRole}
          </span>
        </div>

        {/* User Data Card */}
        <div className="flex items-center gap-3 p-1.5 bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="w-10 h-10 bg-gradient-to-tr from-[#2563EB] to-[#60A5FA] rounded-full flex items-center justify-center text-white font-bold border-2 border-white shadow-sm flex-shrink-0">
            {loading ? '...' : getInitials(userData?.name)}
          </div>
          
          <div className={`transition-all duration-300 whitespace-nowrap ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
            <p className="text-sm font-bold text-[#1E293B] truncate max-w-[120px]">
              {loading ? 'Loading...' : (userData?.name || 'User')}
            </p>
            <p className="text-[10px] text-[#64748B] font-medium">
              ID: {userData?.id || '-------'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};
