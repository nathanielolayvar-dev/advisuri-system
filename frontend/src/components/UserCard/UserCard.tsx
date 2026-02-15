/**
 * UserCard Component - Displays the logged-in user's profile information
 * 
 * Shows the user's full name, email, and a role badge indicating
 * whether they are a Teacher or Student.
 * 
 * Security Logic:
 * - Teachers (Staff): is_staff === true - displays "Teacher" badge with blue styling
 * - Students: is_staff === false - displays "Student" badge with green styling
 * 
 * Usage:
 * <UserCard user={userData} isStaff={true} />
 */

import React from 'react';
import { Mail, User, GraduationCap, BookOpen } from 'lucide-react';
import { ApiUser } from '../../shared/types';
import { Badge } from '../UserInterface/badge';

interface UserCardProps {
  /** The user data from api_user table */
  user: ApiUser | null;
  /** Whether the user is a staff member (teacher) */
  isStaff?: boolean;
  /** Optional: Custom className for styling */
  className?: string;
  /** Optional: Show email field */
  showEmail?: boolean;
  /** Optional: Compact variant */
  compact?: boolean;
}

export const UserCard: React.FC<UserCardProps> = ({
  user,
  isStaff = false,
  className = '',
  showEmail = true,
  compact = false
}) => {
  if (!user) {
    return (
      <div className={`bg-white rounded-2xl border border-slate-200 p-6 ${className}`}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-200 animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
            <div className="h-3 w-32 bg-slate-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Get user's full name or fall back to username
  const fullName = [user.first_name, user.last_name]
    .filter(Boolean)
    .join(' ') || user.username;
  
  // Get initials for avatar
  const initials = fullName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || user.username.charAt(0).toUpperCase();

  // Generate avatar color based on user ID
  const getAvatarColor = (id: string) => {
    const colors = [
      'from-blue-500 to-indigo-600',
      'from-purple-500 to-pink-500',
      'from-green-500 to-teal-500',
      'from-orange-500 to-red-500',
      'from-cyan-500 to-blue-500',
      'from-violet-500 to-purple-500'
    ];
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  if (compact) {
    // Compact version for sidebar or header
    return (
      <div className={`flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors ${className}`}>
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(user.id)} flex items-center justify-center text-white font-bold text-sm shadow-md`}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{fullName}</p>
          <Badge 
            variant={isStaff ? 'default' : 'secondary'}
            className={`text-[10px] px-2 py-0.5 ${isStaff ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-green-100 text-green-700 border-green-200'}`}
          >
            {isStaff ? (
              <><GraduationCap className="w-3 h-3 mr-1" /> Teacher</>
            ) : (
              <><BookOpen className="w-3 h-3 mr-1" /> Student</>
            )}
          </Badge>
        </div>
      </div>
    );
  }

  // Full version
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 p-6 shadow-sm ${className}`}>
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getAvatarColor(user.id)} flex items-center justify-center text-white font-bold text-lg shadow-lg flex-shrink-0`}>
          {initials}
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-slate-800 truncate">
              {fullName}
            </h3>
          </div>
          
          {/* Role Badge */}
          <Badge 
            variant={isStaff ? 'default' : 'secondary'}
            className={`mb-3 ${isStaff 
              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0' 
              : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0'
            }`}
          >
            {isStaff ? (
              <><GraduationCap className="w-3 h-3 mr-1" /> Teacher</>
            ) : (
              <><BookOpen className="w-3 h-3 mr-1" /> Student</>
            )}
          </Badge>

          {/* Email */}
          {showEmail && user.email && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Mail className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{user.email}</span>
            </div>
          )}

          {/* Username */}
          <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
            <User className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">@{user.username}</span>
          </div>
        </div>
      </div>

      {/* Additional Info (Role from API) */}
      {user.role && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            Role: <span className="font-medium text-slate-600 capitalize">{user.role}</span>
          </p>
        </div>
      )}
    </div>
  );
};

export default UserCard;
