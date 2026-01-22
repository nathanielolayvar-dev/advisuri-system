import React from 'react';
import { ChevronRight } from 'lucide-react';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  isPinned: boolean;
  onClick?: () => void;
  className?: string; // Allows for custom colors like red for logout
}

export const NavItem: React.FC<NavItemProps> = ({
  icon,
  label,
  active = false,
  isPinned,
  onClick,
  className = '',
}) => {
  return (
    <button
      onClick={(e) => {
        if (onClick) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`w-full flex items-center h-12 rounded-2xl transition-all duration-200 group/item relative overflow-hidden ${
        active
          ? 'bg-[#EFF6FF] text-[#2563EB] shadow-sm shadow-blue-50'
          : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#1E293B]'
      } ${className}`}
    >
      {/* Icon Container - Fixed width ensures alignment when collapsed */}
      <div className="w-12 flex-shrink-0 flex items-center justify-center">
        <span
          className={`${
            active
              ? 'text-[#2563EB]'
              : 'text-[#94A3B8] group-hover/item:text-[#2563EB]'
          } transition-colors`}
        >
          {icon}
        </span>
      </div>

      {/* Label - Sliding animation */}
      <span
        className={`font-bold text-sm tracking-tight whitespace-nowrap transition-all duration-300
        ${
          isPinned
            ? 'opacity-100 translate-x-0'
            : 'opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0'
        }
      `}
      >
        {label}
      </span>

      {/* Active Indicator Arrow */}
      {active && (
        <div
          className={`absolute right-4 transition-opacity duration-300
           ${isPinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
        `}
        >
          <ChevronRight size={16} />
        </div>
      )}
    </button>
  );
};
