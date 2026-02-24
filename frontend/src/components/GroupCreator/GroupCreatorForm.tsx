/**
 * GroupCreatorForm - Form for creating groups with student selection
 * 
 * Features:
 * - Access control: Only teachers can see/use this form
 * - Multi-select student dropdown
 * - Creates group AND adds members in one transaction
 * - Uses UserProfileContext for teacher verification
 * 
 * Usage:
 * <GroupCreatorForm onSuccess={() => refreshGroups()} />
 */

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { useUserProfile } from '../../contexts/UserProfileContext';
import { Loader2, Users, Check, X, Plus } from 'lucide-react';

interface Student {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
}

interface GroupCreatorFormProps {
  onSuccess?: () => void;
}

export const GroupCreatorForm: React.FC<GroupCreatorFormProps> = ({ onSuccess }) => {
  const { isTeacher, loading: profileLoading, profile, refreshProfile } = useUserProfile();
  
  // Form state
  const [groupName, setGroupName] = useState('');
  const [course, setCourse] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Fetch students (non-staff users)
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

      setStudents(data || []);
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setStudentsLoading(false);
    }
  }, []);

  // Fetch students when form loads (for teachers)
  useEffect(() => {
    if (isTeacher && !profileLoading) {
      fetchStudents();
    }
  }, [isTeacher, profileLoading, fetchStudents]);

  // Toggle student selection
  const toggleStudent = (studentId: string) => {
    setSelectedStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return setError('Group name is required');
    if (!profile?.user_id) return setError('User not authenticated');

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // STEP 1: Create the group with 'group_name' and 'created_by'
      const { data: groupData, error: groupError } = await supabase
        .from('groups') // Matches your schema
        .insert([{ 
          group_name: groupName.trim(), 
          course: course.trim(),
          created_by: profile.user_id // Ensure the teacher is the owner
        }])
        .select()
        .single();

      if (groupError) throw groupError;

      // STEP 2: Prepare member list (Students + The Teacher)
      const memberIds = Array.from(selectedStudents);
      memberIds.push(profile.user_id); // Auto-add the teacher to their own group

      const memberInserts = memberIds.map(studentId => ({
        group_id: groupData.group_id, // Matches your schema 'group_id'
        user_id: studentId
      }));

      const { error: membersError } = await supabase
        .from('group_members')
        .insert(memberInserts);

      if (membersError) {
        console.error('Error adding members:', membersError);
        setSuccess(`Group created, but adding members failed.`);
      } else {
        setSuccess(`Success! Group created with ${selectedStudents.size} students.`);
      }

      // Reset and Refresh
      setGroupName('');
      setCourse('');
      setSelectedStudents(new Set());
      onSuccess?.();
      
    } catch (err: any) {
      console.error('Submission error:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Loading state - show loading while checking profile
  if (profileLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" />
        <span>Loading...</span>
      </div>
    );
  }

  // Access denied - not a teacher
  if (!isTeacher) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl">
        <div className="flex items-center gap-3">
          <X className="w-5 h-5 text-red-500" />
          <div>
            <h3 className="font-semibold text-red-700">Access Denied</h3>
            <p className="text-sm text-red-600">Only teachers can create groups.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-100">
          <Users className="w-5 h" />
        </div>
        <div>
          <h2 className-5 text-white="text-xl font-bold text-slate-800">Create New Group</h2>
          <p className="text-xs text-slate-400">Add students while creating</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-600">
            {success}
          </div>
        )}

        {/* Group Name */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Group Name <span className="text-red-500">*</span>
          </label>
          <input
            required
            type="text"
            placeholder="e.g., Project Alpha Team"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            disabled={loading}
          />
        </div>

        {/* Course */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
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
            Add Students
            {selectedStudents.size > 0 && (
              <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full">
                {selectedStudents.size} selected
              </span>
            )}
          </label>
          
          {/* Multi-select dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              disabled={studentsLoading || loading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all flex items-center justify-between text-left"
            >
              <span className="text-slate-600">
                {studentsLoading ? 'Loading students...' : 
                 selectedStudents.size === 0 ? 'Select students to add...' : 
                 `${selectedStudents.size} student${selectedStudents.size > 1 ? 's' : ''} selected`}
              </span>
              <svg 
                className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} 
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Options */}
            {dropdownOpen && !studentsLoading && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                {students.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-sm">
                    No students available
                  </div>
                ) : (
                  <ul>
                    {students.map((student) => (
                      <li 
                        key={student.id}
                        onClick={() => toggleStudent(student.id)}
                        className="flex items-center justify-between px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            selectedStudents.has(student.id) 
                              ? 'bg-blue-500 border-blue-500' 
                              : 'border-slate-300'
                          }`}>
                            {selectedStudents.has(student.id) && <Check className="w-3 h-3 text-white" />}
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
          {selectedStudents.size > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {students
                .filter(s => selectedStudents.has(s.id))
                .map(student => (
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
          disabled={loading || !groupName.trim()}
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
              Create Group {selectedStudents.size > 0 && `with ${selectedStudents.size} Student${selectedStudents.size > 1 ? 's' : ''}`}
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default GroupCreatorForm;
