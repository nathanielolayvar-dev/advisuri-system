import React, { useState, useEffect, useCallback } from 'react';
import { X, Layout, BookOpen, Loader2, Plus, Check, Users, ChevronDown } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { createGroupWithMembers, CreateGroupWithMembersResult } from '../../services/groupService';

interface GroupCreatorProps {
  userId: string;
  isStaff: boolean;
  onGroupCreated?: (result: CreateGroupWithMembersResult) => void;
  onClose?: () => void;
  isOpen?: boolean;
}

interface StudentOption {
  id: string;
  email: string;
  full_name: string;
  selected: boolean;
}

export const GroupCreator: React.FC<GroupCreatorProps> = ({
  userId,
  isStaff,
  onGroupCreated,
  onClose,
  isOpen = true
}) => {
  const [name, setName] = useState('');
  const [course, setCourse] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Fetch students from the NEW 'users' table
  const fetchStudents = useCallback(async () => {
    setStudentsLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('users') 
        .select('user_id, full_name, email')
        .eq('role', 'student')
        .order('full_name', { ascending: true });

      if (fetchError) throw fetchError;

      setSelectedStudents((data || []).map((student: any) => ({
        id: student.user_id,
        full_name: student.full_name || '',
        email: student.email || '',
        selected: false
      })));
    } catch (err: any) {
      console.error('Error fetching students:', err);
    } finally {
      setStudentsLoading(false);
    }
  }, []);

  // Fetch students when modal opens
  useEffect(() => {
    if (isOpen && isStaff) {
      fetchStudents();
    }
  }, [isOpen, isStaff, fetchStudents]);

  if (!isOpen) return null;

  // If not staff, show access denied immediately
  if (!isStaff) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 text-center">
          <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold">Access Denied</h2>
          <p className="text-slate-600 mb-4">Only teachers can create groups.</p>
          <button onClick={onClose} className="px-6 py-2 bg-slate-100 rounded-lg">Close</button>
        </div>
      </div>
    );
  }

  const toggleStudent = (studentId: string) => {
    setSelectedStudents(prev => prev.map(s => s.id === studentId ? { ...s, selected: !s.selected } : s));
  };

  const getSelectedIds = () => selectedStudents.filter(s => s.selected).map(s => s.id);
  const selectedCount = selectedStudents.filter(s => s.selected).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Group name is required');

    setLoading(true);
    setError(null);

    try {
      // FIX: Add the teacher's userId to the array of student IDs
      const allMemberIds = [...getSelectedIds(), userId];

      const result = await createGroupWithMembers(
        {
          name: name.trim(),
          course: course.trim(),
          memberIds: allMemberIds // Use the combined list here
        },
        userId,
        isStaff
      );

      if (result.errors.length > 0) {
        setError(result.errors[0]);
        setLoading(false);
      } else {
        onGroupCreated?.(result);
        handleClose();
      }
    } catch (err: any) {
      setError(err.message);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg">
              <Layout className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Create New Group</h2>
          </div>
          <button onClick={handleClose} className="text-slate-400 p-2 hover:bg-slate-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-180px)]">
          {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Group Name *</label>
            <input
              required
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project Alpha"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Course</label>
            <input
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              placeholder="e.g. CS101"
            />
          </div>

          {/* Student Dropdown */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase flex justify-between">
              <span>Add Students</span>
              {selectedCount > 0 && <span className="text-blue-600">{selectedCount} selected</span>}
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center"
              >
                <span className="text-slate-600 truncate">
                  {studentsLoading ? 'Loading...' : selectedCount === 0 ? 'Select students...' : `${selectedCount} selected`}
                </span>
                <ChevronDown size={18} />
              </button>

              {dropdownOpen && (
                <div className="absolute top-full mt-2 w-full bg-white border rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                  {selectedStudents.map(student => (
                    <div
                      key={student.id}
                      onClick={() => toggleStudent(student.id)}
                      className="flex items-center gap-3 p-3 hover:bg-blue-50 cursor-pointer border-b last:border-0"
                    >
                      <div className={`w-5 h-5 rounded border flex items-center justify-center ${student.selected ? 'bg-blue-500 border-blue-500' : 'border-slate-300'}`}>
                        {student.selected && <Check size={12} className="text-white" />}
                      </div>
                      <span className="text-sm font-medium">{student.full_name || student.email}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Create Group'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default GroupCreator;