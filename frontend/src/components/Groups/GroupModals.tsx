/**
 * GroupModal - Modal form for creating new groups
 * 
 * This component provides a modal form for teachers to create new groups.
 * It uses Supabase directly to ensure proper RLS policy enforcement.
 * 
 * Security Logic:
 * - Teachers (Staff): is_staff === true - can see and use this form
 * - Students: is_staff === false - component should not be rendered
 */

import React, { useState } from 'react';
import { X, Layout, BookOpen, Loader2 } from 'lucide-react';
import { supabase } from '../../supabaseClient';

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (group: any) => void;
  isStaff: boolean;
}

export const GroupModal: React.FC<GroupModalProps> = ({ 
  isOpen, 
  onClose, 
  onGroupCreated,
  isStaff 
}) => {
  const [name, setName] = useState('');
  const [course, setCourse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;
  if (!isStaff) return null; // Only render for staff/teachers

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Group name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
    const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData.user?.id;

      if (!currentUserId) {
        setError("You must be logged in to create a group.");
        setLoading(false);
        return;
      }

      // 2. Insert using the correct column names: group_name and created_by
      const { data, error: supabaseError } = await supabase
        .from('groups')
        .insert([{ 
          group_name: name.trim(), // Matches your SQL 'group_name'
          course: course.trim(), 
          created_by: currentUserId // Link the group to the teacher
        }])
        .select()
        .single();

      if (supabaseError) {
        console.error('Error creating group:', supabaseError);
        
        // Handle specific error codes
        if (supabaseError.code === '42501') {
          setError('Permission Denied: Only teachers can create groups.');
        } else if (supabaseError.code === '23505') {
          setError('A group with this name already exists.');
        } else {
          setError(`Failed to create group: ${supabaseError.message}`);
        }
        setLoading(false);
        return;
      }

      if (data) {
        onGroupCreated(data);
        setName('');
        setCourse('');
        onClose();
      }
    } catch (err) {
      console.error('Unexpected error creating group:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-100">
              <Layout className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Create New Group</h2>
              <p className="text-xs text-slate-400">Set up a new workspace</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
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
              Group Name
            </label>
            <input 
              required 
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Project Alpha Team"
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
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              value={course} 
              onChange={(e) => setCourse(e.target.value)}
              placeholder="e.g., CS101 - Introduction to Programming"
              disabled={loading}
            />
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={loading || !name.trim()}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Launch Workspace'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default GroupModal;
