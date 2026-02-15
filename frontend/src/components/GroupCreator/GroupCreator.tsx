/**
 * GroupCreator - Advanced Group Creation Form with Member Selection
 * 
 * Features:
 * - Creates a new group in api_group
 * - Adds multiple students to the group in api_group_members
 * - Proper hook ordering to prevent "White Screen" errors
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, Layout, BookOpen, Loader2, Plus, Check, Users, ChevronDown } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { ApiUser } from '../../shared/types';
import { createGroupWithMembers, verifyTeacherPermissions, CreateGroupWithMembersResult } from '../../services/groupService';

interface GroupCreatorProps {
  userId: string;
  isStaff: boolean;
  onGroupCreated?: (result: CreateGroupWithMembersResult) => void;
  onClose?: () => void;
  isOpen?: boolean;
}

interface StudentOption {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  selected: boolean;
}

export const GroupCreator: React.FC<GroupCreatorProps> = ({
  userId,
  isStaff,
  onGroupCreated,
  onClose,
  isOpen = true
}) => {
  // === 1. ALL HOOKS FIRST ===
  
  // Form state
  const [name, setName] = useState('');
  const [course, setCourse] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<StudentOption[]>([]);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(true);

  // Define fetch students function
  const fetchStudents = useCallback(async () => {
    setStudentsLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('api_user')
        .select('id, username, first_name, last_name')
        .eq('is_staff', false)
        .order('username', { ascending: true });

      if (fetchError) {
        console.error('Error fetching students:', fetchError);
        setStudentsLoading(false);
        return;
      }

      setSelectedStudents((data || []).map((student: Partial<ApiUser>) => ({
        id: student.id || '',
        username: student.username || '',
        first_name: student.first_name || '',
        last_name: student.last_name || '',
        selected: false
      })));
    } catch (err) {
      console.error('Unexpected error fetching students:', err);
    } finally {
      setStudentsLoading(false);
    }
  }, []);

  // Verify teacher permissions on mount
  useEffect(() => {
    const verifyPermissions = async () => {
      if (!userId) return;
      setVerifyLoading(true);
      const result = await verifyTeacherPermissions(userId);
      setVerified(result.canCreate);
      if (!result.canCreate && result.error) {
        setError(result.error);
      }
      setVerifyLoading(false);
    };

    if (userId) {
      verifyPermissions();
    }
  }, [userId]);

  // Fetch students after verification
  useEffect(() => {
    if (verified && !verifyLoading) {
      fetchStudents();
    }
  }, [verified, verifyLoading, fetchStudents]);

  // === 2. CONDITIONAL RETURNS AFTER HOOKS ===

  // Early return if not open
  if (!isOpen) {
    return null;
  }

  // Show loading while verifying permissions
  if (verifyLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-600">Verifying permissions...</p>
        </div>
      </div>
    );
  }

  // Show access denied if not a teacher
  if (!isStaff || !verified) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-6 h-6 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h2>
            <p className="text-slate-600 mb-4">{error || 'Only teachers can create groups.'}</p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // === 3. HELPER FUNCTIONS ===

  const toggleStudent = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.map(s => 
        s.id === studentId ? { ...s, selected: !s.selected } : s
      )
    );
  };

  const getSelectedIds = () => 
    selectedStudents.filter(s => s.selected).map(s => s.id);

  const selectedCount = selectedStudents.filter(s => s.selected).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Group name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await createGroupWithMembers(
        {
          name: name.trim(),
          course: course.trim(),
          memberIds: getSelectedIds()
        },
        userId
      );

      if (result.errors.length > 0) {
        const permissionError = result.errors.find(e => 
          e.includes('Permission Denied') || e.includes('Teacher permissions')
        );
        
        if (permissionError) {
          setError('Database Error: Your account does not have Teacher permissions in the api_user table.');
        } else {
          setError(result.errors[0]);
        }
        setLoading(false);
        return;
      }

      // Success!
      onGroupCreated?.(result);
      handleClose();
    } catch (err) {
      console.error('Unexpected error creating group:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setCourse('');
    setSelectedStudents(prev => prev.map(s => ({ ...s, selected: false })));
    setError(null);
    onClose?.();
  };

  // === 4. MAIN UI RETURN ===
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-100">
              <Layout className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Create New Group</h2>
              <p className="text-xs text-slate-400">Add students while creating</p>
            </div>
          </div>
          <button 
            onClick={handleClose} 
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Group Name */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Layout className="w-3 h-3" />
              Group Name <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="text"
              placeholder="e.g., Project Alpha Team"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              disabled={loading}
            />
          </div>

          {/* Course */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-3 h-3" />
              Course (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g., CS101 - Introduction to Programming"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              disabled={loading}
            />
          </div>

          {/* Student Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-3 h-3" />
              Add Students (Optional)
              {selectedCount > 0 && (
                <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full">
                  {selectedCount} selected
                </span>
              )}
            </label>
            
            {/* Multi-select dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                disabled={studentsLoading || loading}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all flex items-center justify-between"
              >
                <span className="text-slate-600">
                  {studentsLoading ? 'Loading students...' : 
                   selectedCount === 0 ? 'Select students to add...' : 
                   `${selectedCount} student${selectedCount > 1 ? 's' : ''} selected`}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Options */}
              {dropdownOpen && !studentsLoading && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                  {selectedStudents.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-sm">
                      No students available
                    </div>
                  ) : (
                    <ul>
                      {selectedStudents.map((student) => (
                        <li 
                          key={student.id}
                          onClick={() => toggleStudent(student.id)}
                          className="flex items-center justify-between px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              student.selected 
                                ? 'bg-blue-500 border-blue-500' 
                                : 'border-slate-300'
                            }`}>
                              {student.selected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-700">
                                {[student.first_name, student.last_name].filter(Boolean).join(' ') || student.username}
                              </p>
                              <p className="text-xs text-slate-400">@{student.username}</p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Selected Students Preview */}
            {selectedCount > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedStudents.filter(s => s.selected).map(student => (
                  <span 
                    key={student.id}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg"
                  >
                    {student.username}
                    <button
                      type="button"
                      onClick={() => toggleStudent(student.id)}
                      className="hover:text-blue-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={loading || !name.trim()}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Create Group {selectedCount > 0 && `with ${selectedCount} Student${selectedCount > 1 ? 's' : ''}`}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default GroupCreator;
