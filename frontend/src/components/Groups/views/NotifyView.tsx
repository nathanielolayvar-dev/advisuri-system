import React, { useState, useEffect } from 'react';
import { Bell, Plus, Clock, User, Trash2, Megaphone, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import { SupabaseAnnouncement } from '../../../shared/types';

interface NotifyViewProps {
  groupId: string | number;
  isStaff: boolean;
  userId: string;
}

export const NotifyView = ({ groupId, isStaff, userId }: NotifyViewProps) => {
  const [announcements, setAnnouncements] = useState<SupabaseAnnouncement[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  
  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (groupId) fetchAnnouncements();
  }, [groupId]);

  const fetchAnnouncements = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('group_announcements')
      .select('*, users!group_announcements_author_id_fkey ( full_name )')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });
      
    if (!error) setAnnouncements(data || []);

    if (userId) {
      const { data: readData } = await supabase
        .from('user_announcement_reads')
        .select('announcement_id')
        .eq('user_id', userId);
      setReadIds(new Set((readData || []).map((r: any) => r.announcement_id)));
    }

    setLoading(false);
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !userId) return;
    
    setIsSubmitting(true);
    
    const { error } = await supabase.from('group_announcements').insert([{
      group_id: groupId,
      author_id: userId,
      title: title.trim(),
      content: content.trim()
    }]);

    if (!error) {
      setTitle('');
      setContent('');
      setShowForm(false);
      fetchAnnouncements();
    } else {
      alert('Failed to post announcement.');
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this announcement?')) {
      const { error } = await supabase
        .from('group_announcements')
        .delete()
        .eq('id', id);
        
      if (!error) {
        fetchAnnouncements();
      }
    }
  };

  const handleMarkAsRead = async (announcementId: string) => {
    if (!userId) return;
    const { error } = await supabase
      .from('user_announcement_reads')
      .insert([{ user_id: userId, announcement_id: announcementId }]);
    if (!error) {
      setReadIds(prev => new Set(prev).add(announcementId));
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 p-6 overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
            <Bell size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Group Announcements</h2>
            <p className="text-sm text-slate-500">Important updates from your adviser</p>
          </div>
        </div>

        {isStaff && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus size={16} />
            {showForm ? 'Cancel' : 'New Announcement'}
          </button>
        )}
      </div>

      {/* Announcement Form (Teachers only) */}
      {showForm && isStaff && (
        <form onSubmit={handlePostAnnouncement} className="bg-white border border-blue-100 shadow-sm shadow-blue-100/50 p-5 rounded-xl mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Subject</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Deadline Extension"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Message</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your announcement here..."
                rows={4}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting || !title || !content}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Posting...' : 'Post Announcement'}
            </button>
          </div>
        </form>
      )}

      {/* Announcements List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center text-slate-400 py-8">Loading announcements...</div>
        ) : announcements.length === 0 ? (
          <div className="text-center bg-white border border-slate-200 rounded-xl py-12 px-4">
            <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-slate-700 font-medium">No announcements yet</h3>
            <p className="text-slate-500 text-sm mt-1">When your teacher posts an update, it will appear here.</p>
          </div>
        ) : (
          announcements.map((ann) => {
            const isRead = readIds.has(ann.id) || (isStaff && ann.author_id === userId);
            return (
            <div key={ann.id} className={`bg-white border rounded-xl p-5 shadow-sm relative group transition-colors ${!isRead ? 'border-blue-300 bg-blue-50/30' : 'border-slate-200'}`}>
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-slate-800">{ann.title}</h3>
                  {!isRead && <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">New</span>}
                </div>
                <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium whitespace-nowrap bg-slate-100 px-2.5 py-1 rounded-full"><Clock size={12} /> {new Date(ann.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed mb-4">{ann.content}</p>
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-sm text-slate-500 font-medium"><div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs"><User size={12} /></div> {/* @ts-ignore */} {ann.users?.full_name || 'Teacher'}</div> 
                <div className="flex items-center gap-2">
                  {!isRead && !isStaff && (
                    <button onClick={() => handleMarkAsRead(ann.id)} className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded-lg transition-colors"><CheckCircle2 size={14} /> Mark as Read</button>
                  )}
                  {isStaff && ann.author_id === userId && ( <button onClick={() => handleDelete(ann.id)} className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button> )} 
                </div>
              </div>
            </div>
          )})
        )}
      </div>
    </div>
  );
};