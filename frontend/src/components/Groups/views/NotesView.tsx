import React, { useState, useEffect } from 'react';
import { FileText, Clock, Trash2, Plus, Search, User } from 'lucide-react';
import '../../../styles/NotesView.css';
import api from '../../../api';
import { Task, TaskNote, Group } from '../../../shared/types';
import { getStatusColor } from '../../../shared/utils';

interface NotesViewProps {
  groupId: number;
}

export const NotesView = ({ groupId }: NotesViewProps) => {
  const [notes, setNotes] = useState<TaskNote[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  // Re-fetch notes whenever the selected group changes
  useEffect(() => {
    if (groupId) {
      fetchGroupNotes();
    }
  }, [groupId]); // This "dependency" tells React: "Run this whenever the ID changes"

  const fetchGroupNotes = () => {
    setLoading(true);
    // Modified to fetch group-specific notes if your API supports it
    // Example: api.get<TaskNote[]>(`/api/notes/?group=${groupId}`)
    // We append the group ID to the URL so the Django 'get_queryset' can find it
    api
      .get<TaskNote[]>(`/api/notes/?group=${groupId}`)
      .then((res) => setNotes(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId) return;

    api
      .post<TaskNote>('/api/notes/', {
        title,
        content,
        group: groupId,
      })
      .then((res) => {
        if (res.status === 201) {
          setTitle('');
          setContent('');
          // Update state locally so the new note appears instantly
          setNotes((prevNotes) => [res.data, ...prevNotes]);
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
    <div className="notes-container">
      {/* Search and Action Bar */}
      <div className="flex justify-between items-center mb-8">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search notes..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> New Note
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="notes-grid">
          {notes.map((note) => (
            <div key={note.id} className="note-card">
              <div className="note-header">
                <h3 className="note-title">{note.title}</h3>
                <FileText className="w-4 h-4 text-slate-300" />
              </div>

              <p className="note-content">{note.content}</p>

              <div className="note-footer">
                <div className="note-meta">
                  <User className="w-3 h-3" />
                  <span>{note.author_name}</span>
                </div>
                <div className="note-meta">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(note.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {notes.length === 0 && !loading && (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
            <FileText className="w-8 h-8 opacity-20" />
            <p className="text-sm italic">No notes found for this group.</p>
          </div>
        )}
      </div>
    </div>
  );
};
