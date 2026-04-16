import React, { useState, useEffect, useRef } from 'react';
import { FileText, Clock, User, Plus, ArrowLeft, Trash2, Paperclip, X, MoreVertical, Users } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import '../../../styles/NotesView.css';
import { SupabaseTask, SupabaseTaskNote, SupabaseAttachment, Document } from '../../../shared/types';

interface GroupMember {
  user_id: string;
  full_name: string;
  email: string;
  role?: string;
}

interface Subtask {
  id: string;
  title: string;
  assigned_to: string;
}

interface TasksViewProps {
  groupId: string | number;
  isStaff: boolean;
  userId: string;
}

export const TasksView = ({ groupId, isStaff, userId }: TasksViewProps) => {
  const [tasks, setTasks] = useState<SupabaseTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<SupabaseTask | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTask, setNewTask] = useState({ 
    title: '', 
    description: '', 
    priority: '', 
    status: '', 
    due_date: '',
    parent_task_id: '',
    assigned_to: ''
  });
  const [notes, setNotes] = useState<SupabaseTaskNote[]>([]);
  const [noteContent, setNoteContent] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editTask, setEditTask] = useState<any>(null);
  const [editFields, setEditFields] = useState({ priority: '', due_date: '' });
  const priorities = ['low', 'medium', 'high'];
  const statuses = ['pending', 'in-progress', 'completed'];
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeGradingSub, setActiveGradingSub] = useState<any>(null);
  const [feedback, setFeedback] = useState('');
  const [taskScore, setTaskScore] = useState<number | ''>('');
  const [isTaskMenuOpen, setIsTaskMenuOpen] = useState(false);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [subtasks, setSubtasks] = useState<SupabaseTask[]>([]);
  const [newSubtasks, setNewSubtasks] = useState<{ title: string; assigned_to: string }[]>([]);
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);

  useEffect(() => {
    if (groupId) {
      fetchTasks();
      fetchGroupMembers();
    }
  }, [groupId]);

  const fetchGroupMembers = async () => {
    // Get group members from the group_members table joined with users table
    const { data, error } = await supabase
      .from('group_members')
      .select(`
        user_id,
        users (
          full_name,
          email,
          role
        )
      `)
      .eq('group_id', groupId);
    
    if (!error && data) {
      // Transform the data to flat structure
      const members = data.map((item: any) => ({
        user_id: item.user_id,
        full_name: item.users?.full_name || '',
        email: item.users?.email || '',
        role: item.users?.role || ''
      }));
      setGroupMembers(members as GroupMember[]);
    }
  };

  const fetchTasks = async () => {
    setLoading(true);
    // Ensure groupId is converted to string for consistent comparison
    const groupIdStr = String(groupId);
    
    // Fetch tasks
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('group_id', groupIdStr)
      .order('created_at', { ascending: false });
    
    if (!error) {
      const allTasks = data || [];
      
      // Fetch users to get assigned user names
      const { data: usersData } = await supabase
        .from('users')
        .select('user_id, full_name');
      
      // Create a map of user_id to full_name
      const userMap = new Map<string, string>();
      (usersData || []).forEach((user: any) => {
        userMap.set(user.user_id, user.full_name);
      });
      
      // Format tasks with assigned user name and calculate progress from subtasks
      const formattedTasks = allTasks.map((task: any) => {
        const taskSubtasks = allTasks.filter((t: any) => t.parent_task_id === task.id);
        
        // Calculate progress based on subtasks
        let calculatedProgress = task.progress_percentage || 0;
        if (taskSubtasks.length > 0) {
          const completedSubtasks = taskSubtasks.filter((st: any) => st.status === 'completed').length;
          calculatedProgress = Math.round((completedSubtasks / taskSubtasks.length) * 100);
        }
        
        // Get assigned user name from userMap
        const assignedUserName = task.assigned_to ? userMap.get(task.assigned_to) || null : null;
        
        return {
          ...task,
          assigned_user_name: assignedUserName,
          progress_percentage: calculatedProgress
        };
      });
      
      setTasks(formattedTasks);
    } else {
      console.error('Error fetching tasks:', error);
    }
    setLoading(false);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title) return;
    
    try {
      // First create the main task
      const { data: mainTaskData, error: mainTaskError } = await supabase.from('tasks').insert([
        {
          title: newTask.title,
          description: newTask.description,
          group_id: groupId,
          creator_id: userId,
          status: 'pending',
          due_date: newTask.due_date,
          priority: newTask.priority,
        },
      ]).select().single();

      if (mainTaskError) throw mainTaskError;

      // If there are subtasks, create them with the main task as parent
      if (newSubtasks.length > 0 && mainTaskData) {
        const subtasksToCreate = newSubtasks
          .filter(st => st.title.trim() !== '')
          .map(st => ({
            title: st.title,
            description: '',
            group_id: groupId,
            creator_id: userId,
            status: 'pending',
            due_date: newTask.due_date,
            priority: newTask.priority || 'medium',
            parent_task_id: mainTaskData.id,
            assigned_to: st.assigned_to || null,
          }));

        if (subtasksToCreate.length > 0) {
          const { error: subtasksError } = await supabase.from('tasks').insert(subtasksToCreate);
          if (subtasksError) throw subtasksError;
        }
      }

      setShowTaskForm(false);
      setNewTask({ title: '', description: '', priority: '', status: '', due_date: '', parent_task_id: '', assigned_to: '' });
      setNewSubtasks([]);
      fetchTasks();
    } catch (err) {
      console.error('Error creating task:', err);
      alert('Failed to create task. Please try again.');
    }
  };

  const openTask = (task: SupabaseTask) => {
    setSelectedTask(task);
    fetchNotes(task.id);
    fetchSubmissions(task.id);
  };

  const fetchNotes = async (taskId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tasknotes')
      .select('*, users ( full_name )')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });
    if (!error) setNotes(data || []);
    setLoading(false);
  };

  const fetchSubmissions = async (taskId: string) => {
    const { data, error } = await supabase
      .from('submissions')
      .select('*, attachments(*)')
      .eq('task_id', taskId)
      .order('version_number', { ascending: false });
    if (!error) setSubmissions(data || []);
  };

  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !noteContent) return;
    await supabase.from('tasknotes').insert([
      {
        content: noteContent,
        task_id: selectedTask.id,
        author_id: userId,
      },
    ]);
    setNoteContent('');
    fetchNotes(selectedTask.id);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 1. Grab the files safely
    const files = e.target.files;
    
    if (files && files.length > 0) {
      setPendingFiles(prev => [...prev, ...Array.from(files)]);
    }

    // 2. Force the browser to "wake up" the rendering thread
    window.focus();

    // 3. Add a tiny delay before resetting the input so React finishes updating the state
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }, 100);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setPendingFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitTask = async () => {
    if (!selectedTask || pendingFiles.length === 0) return;
    setLoading(true);

    // 1. Create a tracker variable outside the try block
    let createdSubmissionId: any = null;

    try {
      const currentMaxVersion = submissions.length > 0 ? Math.max(...submissions.map(s => s.version_number)) : 0;
      const nextVersion = currentMaxVersion + 1;

      // 2. Create the Submission Container
      const { data: submissionData, error: subError } = await supabase
        .from('submissions')
        .insert({
          task_id: selectedTask.id,
          submitted_by: userId,
          version_number: nextVersion
        })
        .select()
        .single();

      if (subError) throw subError;

      // 3. Save the ID so we can delete it later if things go wrong
      createdSubmissionId = submissionData.id;

      // 4. Try to upload all files to Storage
      const uploadPromises = pendingFiles.map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const filePath = `${userId}/${selectedTask.id}/v${nextVersion}/${Math.random().toString(36).substring(7)}_${file.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('capstone_submissions')
          .upload(filePath, file);
          
        if (uploadError) throw uploadError; // If this fails, it jumps to catch()
        
        return {
          submission_id: submissionData.id,
          file_name: file.name,
          file_url: filePath,
          file_type: fileExt
        };
      });

      const attachmentsData = await Promise.all(uploadPromises);
      
      // 5. Link the attachments in the database
      const { error: attachError } = await supabase.from('attachments').insert(attachmentsData);
      if (attachError) throw attachError;

      // Success! Clear the queue.
      setPendingFiles([]);
      fetchSubmissions(selectedTask.id);
    } catch (err) {
      console.error("Error submitting task:", err);
      
      // 🚨 THE FIX: ROLLBACK LOGIC 🚨
      // If we created a submission container but the upload failed, delete the empty container.
      if (createdSubmissionId) {
        console.log("Upload failed. Rolling back empty submission container...");
        await supabase
          .from('submissions')
          .delete()
          .eq('id', createdSubmissionId);
      }
      
      alert("Failed to submit task. Please check file sizes and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLMSGradeSubmit = async (isAccepted: boolean) => {
    if (!selectedTask || !activeGradingSub) return;
    setLoading(true);

    try {
      // 1. Save the feedback and status to the specific submission attempt
      const { error: subError } = await supabase
        .from('submissions')
        .update({
          overall_feedback: feedback, 
          is_accepted: isAccepted 
        })
        .eq('id', activeGradingSub.id);

      if (subError) throw subError;

      // 2. Update the main task with the final score and completion metadata
      const taskUpdatePayload: any = {
        status: isAccepted ? 'completed' : 'in-progress',
        final_score: taskScore === '' ? null : taskScore,
      };

      if (isAccepted) {
        taskUpdatePayload.progress_percentage = 100;
        taskUpdatePayload.completed_at = new Date().toISOString();
      }

      const { error: taskError } = await supabase
        .from('tasks')
        .update(taskUpdatePayload)
        .eq('id', selectedTask.id);

      if (taskError) throw taskError;

      // 3. Update UI
      setSelectedTask(prev => prev ? {
        ...prev,
        status: (isAccepted ? 'completed' : 'in-progress') as 'completed' | 'in-progress' | 'pending',
        final_score: taskScore === '' ? undefined : (taskScore as number),
        progress_percentage: isAccepted ? 100 : prev.progress_percentage,
        completed_at: isAccepted ? new Date().toISOString() : prev.completed_at,
      } : null);
      
      setActiveGradingSub(null); // Close the sidebar
      fetchSubmissions(selectedTask.id);
      
      // 🚨 THE FIX: Refresh the master task list in the background! 🚨
      fetchTasks();
      
    } catch (err) {
      console.error("Error submitting grade:", err);
      alert("Failed to submit grade.");
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setSelectedTask(null);
    setNotes([]);
    setSubmissions([]);
    setPendingFiles([]);
  };

  const handleEditTask = async () => {
    if (!editTask) return;
    const { error } = await supabase.from('tasks').update(editFields).eq('id', editTask.id);
    if (!error) {
      setSelectedTask((prev) => (prev ? { ...prev, ...editFields, priority: editFields.priority as 'low' | 'medium' | 'high' } : null));
      setEditTask(null);
      fetchTasks();
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedTask) return;
    
    // Prepare update data
    const updateData: any = { status: newStatus };
    
    // If marking as completed, set completed_at timestamp and progress_percentage to 100
    if (newStatus === 'completed') {
      updateData.completed_at = new Date().toISOString();
      updateData.progress_percentage = 100;
    }
    
    console.log('Updating task with data:', updateData);
    
    const { error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', selectedTask.id);
    
    if (error) {
      console.error('Error updating task:', error);
      alert(`Failed to update task: ${error.message}`);
      return;
    }
    
    console.log('Task updated successfully');
    
    if (!error) {
      setSelectedTask({
        ...selectedTask,
        status: newStatus as 'pending' | 'in-progress' | 'completed',
        progress_percentage: newStatus === 'completed' ? 100 : selectedTask.progress_percentage,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : selectedTask.completed_at,
      });
      
      // If this is a subtask, update the parent task's progress_percentage
      if (selectedTask.parent_task_id) {
        await updateParentTaskProgress(selectedTask.parent_task_id);
      }
      
      fetchTasks();
    }
  };

  const updateParentTaskProgress = async (parentTaskId: string) => {
    try {
      // Get all subtasks for this parent task
      const { data: subtasks, error: subtasksError } = await supabase
        .from('tasks')
        .select('id, status')
        .eq('parent_task_id', parentTaskId);

      if (subtasksError) {
        console.error('Error fetching subtasks:', subtasksError);
        return;
      }

      if (!subtasks || subtasks.length === 0) return;

      // Calculate progress based on completed subtasks
      const completedSubtasks = subtasks.filter(st => st.status === 'completed').length;
      const totalSubtasks = subtasks.length;
      const progressPercentage = Math.round((completedSubtasks / totalSubtasks) * 100);

      // Prepare update data
      const updateData: any = { progress_percentage: progressPercentage };
      
      // If progress is 100%, set completed_at timestamp
      if (progressPercentage === 100) {
        updateData.completed_at = new Date().toISOString();
        updateData.status = 'completed';
      }

      console.log('Updating parent task with data:', updateData);

      // Update parent task's progress_percentage and potentially completed_at
      const { error: updateError } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', parentTaskId);

      if (updateError) {
        console.error('Error updating parent task progress:', updateError);
      } else {
        console.log(`Updated parent task ${parentTaskId} progress to ${progressPercentage}%${progressPercentage === 100 ? ' (marked as completed)' : ''}`);
      }
    } catch (error) {
      console.error('Error in updateParentTaskProgress:', error);
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;
    
    if (window.confirm('Are you sure you want to delete this task AND all its submitted files? This cannot be undone.')) {
      setLoading(true); // Optional: add a loading state while it cleans up
      
      try {
        // STEP 1: Find all submissions for this task
        const { data: subs, error: subsError } = await supabase
          .from('submissions')
          .select('id')
          .eq('task_id', selectedTask.id);

        if (subsError) throw subsError;

        if (subs && subs.length > 0) {
          const subIds = subs.map(s => s.id);

          // STEP 2: Find all attachments linked to those submissions
          const { data: attachments, error: attachError } = await supabase
            .from('attachments')
            .select('file_url')
            .in('submission_id', subIds);

          if (attachError) throw attachError;

          // STEP 3: Delete the physical files from the Storage Bucket
          if (attachments && attachments.length > 0) {
            // Extract just the string paths into an array
            const filePaths = attachments.map((a: any) => a.file_url); 
            
            console.log("Deleting files from bucket:", filePaths);
            const { error: storageError } = await supabase.storage
              .from('capstone_submissions')
              .remove(filePaths);

            if (storageError) {
              console.error("Warning: Failed to delete some physical files.", storageError);
              // We log the warning but don't stop the process, so the task still gets deleted from the UI
            }
          }
        }

        // STEP 4: Delete the Task from the database
        // (Because of ON DELETE CASCADE, this also deletes the rows in api_submission, api_attachment, and api_tasknote)
        const { error: dbError } = await supabase
          .from('tasks')
          .delete()
          .eq('id', selectedTask.id);

        if (dbError) throw dbError;

        // Success! Reset the UI.
        goBack();
        fetchTasks();
        
      } catch (err) {
        console.error("Error during task deletion process:", err);
        alert("An error occurred while trying to delete the task.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      const { error } = await supabase.from('tasknotes').delete().eq('id', noteId);
      if (!error && selectedTask) fetchNotes(selectedTask.id);
    }
  };

  // Handle creating a single subtask from task details
  const handleCreateSubtask = async (title: string, assignedTo: string) => {
    if (!selectedTask || !title.trim()) return;
    
    try {
      const { error } = await supabase.from('tasks').insert([{
        title: title,
        description: '',
        group_id: groupId,
        creator_id: userId,
        status: 'pending',
        due_date: selectedTask.due_date,
        priority: selectedTask.priority || 'medium',
        parent_task_id: selectedTask.id,
        assigned_to: assignedTo || null,
      }]);
      
      if (!error) {
        fetchTasks();
      }
    } catch (err) {
      console.error('Error creating subtask:', err);
    }
  };

  if (selectedTask) {
    const isTeacher = isStaff;
    // @ts-ignore
    const maxScore = selectedTask.max_score || 100; // Default to 100 if not set

    return (
      <div className="flex w-full h-full bg-slate-50 overflow-hidden">
        
        {/* LEFT COLUMN: Main Task & Submissions View */}
        <div className={`flex-1 overflow-y-auto p-6 transition-all duration-300 ${activeGradingSub ? 'pr-4' : ''}`}>
          <div className="w-full bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <button onClick={goBack} className="mb-4 text-blue-600 text-sm flex items-center gap-1 font-medium hover:underline"><ArrowLeft className="w-4 h-4" /> Back to Tasks</button>
            
            {/* Subtask Creation Form */}
            {showSubtaskForm && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-800 mb-3">Add Subtask</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Subtask title"
                    id="newSubtaskInput"
                    className="flex-1 px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const input = document.getElementById('newSubtaskInput') as HTMLInputElement;
                        const select = document.getElementById('subtaskAssignSelect') as HTMLSelectElement;
                        if (input?.value) {
                          handleCreateSubtask(input.value, select?.value || '');
                          input.value = '';
                          select.value = '';
                        }
                      }
                    }}
                  />
                  <select
                    id="subtaskAssignSelect"
                    className="w-40 px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white"
                  >
                    <option value="">Assign to...</option>
                    {groupMembers.filter(m => m.role !== 'teacher').map(m => (
                      <option key={m.user_id} value={m.user_id}>{m.full_name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      const input = document.getElementById('newSubtaskInput') as HTMLInputElement;
                      const select = document.getElementById('subtaskAssignSelect') as HTMLSelectElement;
                      if (input?.value) {
                        handleCreateSubtask(input.value, select?.value || '');
                        input.value = '';
                        select.value = '';
                        setShowSubtaskForm(false);
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
            
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold mb-1 text-slate-800">{selectedTask.title}</h2>
                <p className="text-slate-600">{selectedTask.description}</p>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Add Subtask Button (for teachers) */}
                {isStaff && !selectedTask.parent_task_id && (
                  <button
                    onClick={() => setShowSubtaskForm(!showSubtaskForm)}
                    className="px-3 py-1.5 bg-blue-50 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Add Subtask
                  </button>
                )}
                {/* 1. NEUTRAL Final Grade Box */}
                {/* @ts-ignore */}
                {selectedTask.final_score !== null && selectedTask.final_score !== undefined && (
                  <div className="bg-slate-50 border border-slate-200 text-slate-800 px-4 py-2 rounded-lg text-center">
                    <div className="text-xs uppercase font-bold text-slate-500 tracking-wider">Final Grade</div>
                    {/* @ts-ignore */}
                    <div className="text-2xl font-black">{selectedTask.final_score} <span className="text-lg text-slate-400 font-medium">/ {maxScore}</span></div>
                  </div>
                )}

                {/* 2. THREE DOTS MENU (Advisers Only) */}
                {isTeacher && (
                  <div className="relative">
                    <button 
                      onClick={() => setIsTaskMenuOpen(!isTaskMenuOpen)} 
                      className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-700"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    
                    {isTaskMenuOpen && (
                      <div className="absolute right-0 mt-2 w-36 bg-white border border-slate-200 shadow-lg rounded-lg overflow-hidden z-10">
                        <button 
                          onClick={() => {
                            setEditTask(selectedTask);
                            setEditFields({
                              priority: selectedTask.priority || 'medium',
                              due_date: selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleString('sv').replace(' ', 'T').slice(0, 16) : '',
                            });
                            setIsTaskMenuOpen(false);
                          }} 
                          className="w-full text-left px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 border-b border-slate-100"
                        >
                          Edit Task
                        </button>
                        <button 
                          onClick={() => {
                            handleDeleteTask();
                            setIsTaskMenuOpen(false);
                          }} 
                          className="w-full text-left px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                        >
                          Delete Task
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 3. METADATA ROW: Due Date | Difficulty (Priority) | Status */}
            <div className="flex items-center gap-3 mb-6 text-xs">
              <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                <Clock className="w-4 h-4" /> 
                {selectedTask.due_date ? `Due ${new Date(selectedTask.due_date).toLocaleString([], { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : 'No Due Date'}
              </span>
              
              <div className="w-px h-4 bg-slate-300"></div> {/* Visual Divider */}

              {selectedTask.priority && (
                <span className={`px-2.5 py-0.5 rounded-full font-semibold capitalize ${selectedTask.priority === 'high' ? 'bg-red-50 text-red-600' : selectedTask.priority === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                  {selectedTask.priority}
                </span>
              )}

              {/* LOCKED STATUS BADGE (Teachers can no longer manually edit this) */}
              <span className={`px-2.5 py-0.5 rounded-full font-semibold capitalize
                ${selectedTask.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : selectedTask.status === 'in-progress' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                {selectedTask.status ? selectedTask.status.replace('-', ' ') : 'Pending'}
              </span>
            </div>

            {/* 4. THE EDIT FORM (Pops up when "Edit Task" is clicked) */}
            {editTask && (
              <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200 animate-in fade-in duration-200">
                <h4 className="font-bold text-sm mb-3 text-slate-700">Edit Task Details</h4>
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1 font-medium">Priority</label>
                    <select 
                      value={editFields.priority} 
                      onChange={e => setEditFields(f => ({ ...f, priority: e.target.value }))} 
                      className="border border-slate-300 rounded-md px-3 py-1.5 text-sm outline-none focus:border-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-slate-500 mb-1 font-medium">Due Date</label>
                    <input 
                      type="datetime-local" 
                      value={editFields.due_date} 
                      onChange={e => setEditFields(f => ({ ...f, due_date: e.target.value }))} 
                      className="border border-slate-300 rounded-md px-3 py-1.5 text-sm outline-none focus:border-blue-500" 
                    />
                  </div>
                  
                  <div className="flex gap-2 self-end mb-0.5">
                    <button 
                      onClick={handleEditTask} 
                      className="bg-blue-600 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      Save Changes
                    </button>
                    <button 
                      onClick={() => setEditTask(null)} 
                      className="text-slate-500 px-3 py-1.5 rounded-md text-sm hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Task Section (Students Only) */}
            {!isTeacher && (
              <div className="mb-6">
                <h4 className="font-bold mb-2">Submit Task</h4>
                <div className="border border-slate-200 rounded-lg p-4 bg-white">
                  <div 
                    className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-colors mb-4 ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50'}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <Paperclip className={`w-8 h-8 mb-2 ${isDragging ? 'text-blue-500' : 'text-slate-400'}`} />
                    <p className="text-sm text-slate-600 font-medium mb-1">Drag & drop files here</p>
                    <p className="text-xs text-slate-400 mb-3">or click to browse</p>
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                    >
                      Browse Files
                    </button>
                    <input 
                      type="file" 
                      multiple 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      className="opacity-0 absolute w-px h-px overflow-hidden -z-10" 
                    />
                  </div>
                  
                  {pendingFiles.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {pendingFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white p-2 rounded border border-slate-200 text-sm">
                          <span className="truncate">{file.name}</span>
                          <button onClick={() => removePendingFile(idx)} className="text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <button 
                    onClick={handleSubmitTask} 
                    disabled={pendingFiles.length === 0 || loading}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                  >
                    {loading ? 'Submitting...' : 'Submit Task'}
                  </button>
                </div>
              </div>
            )}

            {/* Notes Section */}
            <div className="mb-6">
              <h4 className="font-bold mb-2">Add a note</h4>
              <form onSubmit={handleNoteSubmit}>
                <textarea
                  placeholder="Write a note..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="w-full mb-2 px-3 py-2 border border-slate-300 rounded h-24"
                />
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Add Note</button>
              </form>
            </div>
            <div className="mb-6">
              <h4 className="font-bold mb-2">Notes</h4>
              <div className="notes-grid">
                {notes.map((note) => (
                  <div key={note.id} className="note-card p-4 border border-slate-200 rounded-lg mb-2 bg-slate-50 relative group">
                    <p className="text-sm text-slate-800 whitespace-pre-wrap pr-6">{note.content}</p>
                    {(isStaff || note.author_id === userId) && (
                      <button 
                        onClick={() => handleDeleteNote(note.id)}
                        className="absolute top-2 right-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
                      <span className="flex items-center gap-1 font-medium text-slate-500">
                        <User className="w-3 h-3" />
                        {/* @ts-ignore */}
                        {note.users?.full_name || 'Unknown'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(note.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
                {notes.length === 0 && <p className="text-slate-400 text-sm italic">No notes added yet.</p>}
              </div>
            </div>

            {/* Submission History */}
            <div className="mb-6 mt-8">
              <h4 className="text-lg font-bold mb-4 border-b pb-2">Submission History</h4>
              <div className="space-y-4">
                {submissions.map((sub) => (
                  <div key={sub.id} className={`border rounded-lg p-4 transition-colors ${activeGradingSub?.id === sub.id ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200 bg-white'}`}>
                    
                    {/* Header: Attempt Number & Status Badges */}
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-700">Attempt {sub.version_number}</span>
                        
                        {/* Status Badges for the Student to see */}
                        {sub.is_accepted && (
                          <span className="bg-green-100 text-green-700 text-xs px-2.5 py-0.5 rounded-full font-bold">Accepted</span>
                        )}
                        {sub.overall_feedback && !sub.is_accepted && (
                          <span className="bg-orange-100 text-orange-700 text-xs px-2.5 py-0.5 rounded-full font-bold">Needs Revision</span>
                        )}
                      </div>
                      
                      {isTeacher && (
                        <button 
                          onClick={() => {
                            setActiveGradingSub(sub);
                            setFeedback(sub.overall_feedback || '');
                            // @ts-ignore
                            setTaskScore(selectedTask.final_score || '');
                          }}
                          className="bg-slate-800 text-white text-xs px-4 py-1.5 rounded-md hover:bg-slate-700 shadow-sm"
                        >
                          Open in Grader
                        </button>
                      )}
                    </div>
                    
                    {/* Submitted Files List */}
                    <div className="space-y-2 bg-slate-50 p-3 rounded border border-slate-100">
                      {sub.attachments?.map((att: any) => (
                        <div key={att.id} className="flex items-center gap-2 text-sm">
                          <FileText className="w-4 h-4 text-blue-500" />
                          <a href={`https://behbluflerhbslixhywa.supabase.co/storage/v1/object/public/capstone_submissions/${att.file_url}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-medium hover:underline truncate">
                            {att.file_name}
                          </a>
                        </div>
                      ))}
                    </div>

                    {/* NEW: ADVISER FEEDBACK DISPLAY (Visible to Students!) */}
                    {sub.overall_feedback && (
                      <div className="mt-3 bg-blue-50 border border-blue-100 rounded-md p-4">
                        <span className="font-bold text-blue-900 text-xs uppercase tracking-wider block mb-1">Adviser Feedback</span>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{sub.overall_feedback}</p>
                      </div>
                    )}
                    
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: The Canvas-Style Grading Sidebar */}
        {isTeacher && activeGradingSub && (
          <div className="w-96 bg-white border-l border-slate-200 shadow-2xl flex flex-col h-full animate-in slide-in-from-right-8 duration-300">
            
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-800 text-white">
              <h3 className="font-bold">Grading Panel</h3>
              <button onClick={() => setActiveGradingSub(null)} className="text-slate-300 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              <div className="mb-6">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Grading</div>
                <div className="text-lg font-semibold text-slate-700 mb-2">Attempt {activeGradingSub.version_number}</div>
              </div>

              {/* LMS Score Input */}
              <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="block text-sm font-bold text-slate-700 mb-2">Grade (out of {maxScore})</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    value={taskScore}
                    onChange={(e) => setTaskScore(Number(e.target.value))}
                    className="w-24 text-xl font-bold px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
                    placeholder="--"
                  />
                  <span className="text-xl text-slate-400 font-medium">/ {maxScore}</span>
                </div>
              </div>

              {/* LMS Feedback Box */}
              <div className="mb-8">
                <label className="block text-sm font-bold text-slate-700 mb-2">Adviser Comments</label>
                <textarea
                  placeholder="Provide feedback on methodology, formatting, etc..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full text-sm px-4 py-3 border border-slate-300 rounded-lg h-40 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button 
                  onClick={() => handleLMSGradeSubmit(true)}
                  disabled={loading}
                  className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 shadow-sm flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  Accept & Mark Completed
                </button>
                
                <button 
                  onClick={() => handleLMSGradeSubmit(false)}
                  disabled={loading}
                  className="w-full bg-white border-2 border-slate-200 text-slate-700 py-3 rounded-lg font-bold hover:bg-slate-50 disabled:opacity-50"
                >
                  Return for Revision
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto p-6">
      <div className="w-full">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold">Tasks</h2>
          </div>
          {isStaff && (
            <button
              onClick={() => setShowTaskForm((v) => !v)}
              className="bg-blue-600 text-white px-5 py-2 rounded-md font-semibold shadow hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Task
            </button>
          )}
        </div>

        {isStaff && showTaskForm && (
          <div className="mb-8 p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
            <h4 className="text-lg font-semibold mb-4">Create New Task</h4>
            <form onSubmit={handleCreateTask} className="space-y-4">
              {/* Main Task Fields */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Task Title</label>
                <input
                  type="text"
                  placeholder="e.g., Final Report"
                  value={newTask.title}
                  required
                  onChange={(e) => setNewTask((t) => ({ ...t, title: e.target.value }))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  placeholder="Describe the task requirements..."
                  value={newTask.description}
                  onChange={(e) => setNewTask((t) => ({ ...t, description: e.target.value }))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg h-24 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                  <select 
                    value={newTask.priority || ''} 
                    onChange={e => setNewTask(t => ({ ...t, priority: e.target.value }))} 
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="">Select Priority</option>
                    {priorities.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                  <input
                    type="datetime-local"
                    value={newTask.due_date || ''}
                    onChange={e => setNewTask(t => ({ ...t, due_date: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Subtasks Section */}
              <div className="border-t border-slate-200 pt-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-slate-700">
                    Subtasks (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewSubtasks([...newSubtasks, { title: '', assigned_to: '' }])}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus size={16} /> Add Subtask
                  </button>
                </div>

                {newSubtasks.length > 0 && (
                  <div className="space-y-3">
                    {newSubtasks.map((subtask, index) => (
                      <div key={index} className="flex gap-2 items-start bg-slate-50 p-3 rounded-lg">
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder={`Subtask ${index + 1} title`}
                            value={subtask.title}
                            onChange={(e) => {
                              const updated = [...newSubtasks];
                              updated[index].title = e.target.value;
                              setNewSubtasks(updated);
                            }}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                          />
                        </div>
                        <div className="w-48">
                          <select
                            value={subtask.assigned_to}
                            onChange={(e) => {
                              const updated = [...newSubtasks];
                              updated[index].assigned_to = e.target.value;
                              setNewSubtasks(updated);
                            }}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                          >
                            <option value="">Assign to...</option>
                            {groupMembers.filter(m => m.role !== 'teacher').map(m => (
                              <option key={m.user_id} value={m.user_id}>{m.full_name}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = newSubtasks.filter((_, i) => i !== index);
                            setNewSubtasks(updated);
                          }}
                          className="text-slate-400 hover:text-red-500 p-1"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {newSubtasks.length === 0 && (
                  <p className="text-sm text-slate-400 italic">Click "Add Subtask" to create subtasks with individual assignments</p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowTaskForm(false);
                    setNewTask({ title: '', description: '', priority: '', status: '', due_date: '', parent_task_id: '', assigned_to: '' });
                    setNewSubtasks([]);
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
                >
                  {newSubtasks.length > 0 ? `Create Task (${newSubtasks.filter(st => st.title).length} subtasks)` : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {/* First render parent tasks (tasks without parent) - show all tasks including completed */}
          {tasks.filter(t => !t.parent_task_id).map((task) => {
            const taskSubtasks = tasks.filter(st => st.parent_task_id === task.id);
            return (
              <div key={task.id} className="space-y-2">
                <div
                  className={`bg-white border border-slate-200 rounded-xl shadow-sm p-5 hover:shadow-md transition-all cursor-pointer group relative ${
                    (task as any).progress_percentage === 100 ? 'opacity-75' : ''
                  }`}
                  onClick={() => openTask(task)}
                >
                  {/* Completed overlay for 100% progress tasks */}
                  {(task as any).progress_percentage === 100 && (
                    <div className="absolute top-2 right-2 bg-emerald-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                      ✓ Completed
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-slate-800 group-hover:text-blue-600 transition-colors">
                        {task.title}
                      </h3>
                      <p className="text-slate-600 text-sm line-clamp-2 mt-1">{task.description}</p>
                      {/* Assigned user */}
                      {(task as any).assigned_user_name && (
                        <div className="flex items-center gap-1 text-sm text-blue-600 mt-2">
                          <User className="w-4 h-4" />
                          <span>{(task as any).assigned_user_name}</span>
                        </div>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ml-4
                      ${task.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 
                        task.status === 'in-progress' ? 'bg-yellow-100 text-yellow-700' : 
                        'bg-slate-100 text-slate-600'}`}
                    >
                      {task.status ? task.status.replace('-', ' ') : 'pending'}
                    </span>
                  </div>
                  
                  {/* Progress bar for subtasks */}
                  {taskSubtasks.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-500">Subtask Progress</span>
                        <span className="font-medium text-slate-700">
                          {taskSubtasks.filter((st: any) => st.status === 'completed').length}/{taskSubtasks.length} ({task.progress_percentage || 0}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 rounded-full transition-all duration-300"
                          style={{ width: `${task.progress_percentage || 0}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 text-xs text-slate-500 border-t border-slate-100 pt-3 mt-1">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {task.due_date 
                          ? `Due ${new Date(task.due_date).toLocaleString([], { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` 
                          : 'No Due Date'
                        }
                      </span>
                    </div>
                    {task.priority && (
                      <span className={`ml-auto px-2.5 py-0.5 rounded-full font-medium capitalize
                        ${task.priority === 'high' ? 'bg-red-50 text-red-600' : 
                          task.priority === 'medium' ? 'bg-amber-50 text-amber-600' : 
                          'bg-slate-100 text-slate-500'}`}
                      >
                        {task.priority}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Render subtasks */}
                {taskSubtasks.length > 0 && (
                  <div className="ml-6 pl-4 border-l-2 border-blue-200 space-y-2">
                    {taskSubtasks.map(subtask => (
                      <div
                        key={subtask.id}
                        className="bg-blue-50 border border-blue-100 rounded-lg p-3 hover:bg-blue-100 transition-colors cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          openTask(subtask);
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-blue-800 font-medium text-sm">{subtask.title}</span>
                          {(subtask as any).assigned_user_name && (
                            <span className="text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {(subtask as any).assigned_user_name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-blue-600">
                          <span className={`px-2 py-0.5 rounded ${
                            subtask.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 
                            subtask.status === 'in-progress' ? 'bg-yellow-100 text-yellow-700' : 
                            'bg-slate-100 text-slate-600'}`
                          }>
                            {subtask.status || 'pending'}
                          </span>
                          {subtask.due_date && (
                            <span>Due: {new Date(subtask.due_date).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {tasks.length === 0 && !loading && (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <div className="p-4 bg-white rounded-full shadow-sm">
                <FileText className="w-8 h-8 text-slate-300" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-600">No tasks found</p>
                <p className="text-xs text-slate-400 mt-1">Create a task to get started</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
