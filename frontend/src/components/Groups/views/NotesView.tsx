import React, { useState, useEffect } from 'react';
import { FileText, Clock, Trash2, Plus } from 'lucide-react';
import api from '../../../api';
import { Task, TaskNote, Group } from '../../../shared/types';
import { getStatusColor } from '../../../shared/utils';

interface NotesViewProps {
  selectedGroup: Group;
}

export const NotesView = ({ selectedGroup }: NotesViewProps) => {
  const [notes, setNotes] = useState<TaskNote[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  // Re-fetch notes whenever the selected group changes
  useEffect(() => {
    if (selectedGroup?.id) {
      fetchGroupNotes();
    }
  }, [selectedGroup?.id]); // This "dependency" tells React: "Run this whenever the ID changes"

  const fetchGroupNotes = () => {
    setLoading(true);
    // Modified to fetch group-specific notes if your API supports it
    // Example: api.get<TaskNote[]>(`/api/notes/?group=${selectedGroup.id}`)
    // We append the group ID to the URL so the Django 'get_queryset' can find it
    api
      .get<TaskNote[]>(`/api/notes/?group=${selectedGroup.id}`)
      .then((res) => setNotes(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    // Safety check: Don't try to send a request if no group is active
    if (!selectedGroup?.id) {
      alert('Please select a group first!');
      return;
    }
    api
      .post('/api/notes/', {
        title,
        content,
        group: selectedGroup.id, // <--- This matches 'group_id' in Django
      })
      .then((res) => {
        if (res.status === 201) {
          setTitle('');
          setContent('');
          fetchGroupNotes();
        }
      })
      .catch((err) => alert('Error creating note: ' + err));
  };

  const handleDeleteNote = (id: number) => {
    api
      .delete(`/api/notes/delete/${id}/`)
      .then((res) => {
        if (res.status === 204) fetchGroupNotes();
      })
      .catch((err) => alert('Error deleting note: ' + err));
  };

  return (
    <div className="space-y-6">
      {/* Create Note Form (integrated from your Home.jsx) */}
      <form
        onSubmit={handleCreateNote}
        className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0] space-y-3"
      >
        <h5 className="text-sm font-bold text-[#1E293B]">Quick Add Note</h5>
        <input
          required
          className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-[#2563EB]"
          placeholder="Note Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          required
          className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-[#2563EB]"
          placeholder="Share progress or details..."
          rows={2}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <button
          type="submit"
          className="w-full py-2 bg-[#2563EB] text-white rounded-lg text-sm font-bold hover:bg-[#1D4ED8] transition-colors"
        >
          Add to {selectedGroup.name}
        </button>
      </form>

      {/* Notes List (integrated from your NoteComponent) */}
      <div className="space-y-4">
        {loading ? (
          <p className="text-center text-sm text-[#94A3B8]">Loading notes...</p>
        ) : notes.length > 0 ? (
          notes.map((note) => (
            <div
              key={note.id}
              className="p-4 border border-[#E2E8F0] rounded-xl bg-white hover:shadow-sm transition-all group"
            >
              <div className="flex justify-between items-start">
                <h5 className="font-bold text-[#1E293B]">{note.title}</h5>
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-[#94A3B8] hover:text-red-500 hover:bg-red-50 transition-all rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[#64748B] text-sm mt-1">{note.content}</p>
              <div className="flex items-center gap-2 mt-4 text-[10px] text-[#94A3B8] font-medium uppercase tracking-wider">
                <Clock className="w-3 h-3" />
                {new Date(note.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10 border-2 border-dashed rounded-xl">
            <p className="text-[#94A3B8] text-sm">
              No notes found for this group.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
