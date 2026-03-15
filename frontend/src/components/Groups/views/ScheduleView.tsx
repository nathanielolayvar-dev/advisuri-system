import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Clock, X, Trash2 } from 'lucide-react';

interface Schedule {
  id: string;
  title: string;
  description: string;
  schedule_date: string;
  start_time: string;
  end_time: string;
  created_by: string;
}

interface ScheduleViewProps {
  groupId: string;
  isStaff: boolean;
}

export const ScheduleView = ({ groupId, isStaff }: ScheduleViewProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    date: '',
    start_time: '',
    end_time: '',
    description: ''
  });

  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getUserId();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchSchedules = useCallback(async () => {
    if (!groupId) return;
    const firstDay = new Date(year, month, 1).toISOString().slice(0, 10);
    const lastDay = new Date(year, month + 1, 0).toISOString().slice(0, 10);

    try {
      const { data, error } = await supabase
        .from('group_schedules')
        .select('id, title, description, schedule_date, start_time, end_time, created_by')
        .eq('group_id', groupId)
        .gte('schedule_date', firstDay)
        .lte('schedule_date', lastDay)
        .order('schedule_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      setSchedules(data || []);
    } catch (err) {
      console.error('Error fetching schedules:', err);
    }
  }, [groupId, month, year]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId || !groupId) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('group_schedules').insert([{
        group_id: groupId,
        title: formData.title,
        description: formData.description,
        schedule_date: formData.date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        created_by: currentUserId
      }]);

      if (error) throw error;

      setShowAddModal(false);
      setFormData({ title: '', date: '', start_time: '', end_time: '', description: '' });
      fetchSchedules();
    } catch (err) {
      console.error('Failed to create schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!window.confirm('Are you sure you want to delete this schedule? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('group_schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;

      setSelectedEvent(null);
      fetchSchedules();
    } catch (err) {
      console.error('Failed to delete schedule:', err);
      alert('Failed to delete schedule.');
    } finally {
      setLoading(false);
    }
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarIcon className="text-blue-600" />
            {monthNames[month]} {year}
          </h2>
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button onClick={prevMonth} className="p-1 hover:bg-white rounded shadow-sm text-slate-600 transition-all">
              <ChevronLeft size={20} />
            </button>
            <button onClick={nextMonth} className="p-1 hover:bg-white rounded shadow-sm text-slate-600 transition-all">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
        {isStaff && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Add Schedule
          </button>
        )}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 min-h-[500px]">
        <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
          {/* Day Headers */}
          {daysOfWeek.map((day) => (
            <div key={day} className="bg-slate-50 py-2 text-center text-sm font-semibold text-slate-600">
              {day}
            </div>
          ))}

          {/* Empty cells before month start */}
          {Array.from({ length: firstDayOfMonth }).map((_, index) => (
            <div key={`empty-${index}`} className="bg-white min-h-[100px] p-2 opacity-50"></div>
          ))}

          {/* Days of the month */}
          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1;
            const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEvents = schedules.filter(s => s.schedule_date === dateString);
            const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

            return (
              <div key={`day-${day}`} className={`bg-white min-h-[100px] p-2 transition-colors hover:bg-slate-50 border-t border-slate-100`}>
                <div className={`text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-slate-700'}`}>
                  {day}
                </div>
                <div className="flex flex-col gap-1">
                  {dayEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="w-full text-left text-xs p-1.5 rounded bg-blue-50 text-blue-700 border border-blue-100 truncate flex items-center gap-1 hover:bg-blue-100 transition-colors"
                      title={`${event.title} (${event.start_time} - ${event.end_time})`}
                    >
                      <Clock size={10} className="shrink-0" />
                      <span className="truncate">{event.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Schedule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800">Create New Schedule</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddSchedule} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  required
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="e.g. Project Check-in"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input
                    required
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                  <input
                    required
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
                  <input
                    required
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  rows={3}
                  placeholder="Add any additional details..."
                ></textarea>
              </div>
              <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors mt-2">
                {loading ? 'Saving...' : 'Save Schedule'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* View Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800 truncate" title={selectedEvent.title}>
                {selectedEvent.title}
              </h3>
              <button onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-sm text-slate-700 space-y-3">
                <p><strong>Date:</strong> {new Date(selectedEvent.schedule_date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p><strong>Time:</strong> {selectedEvent.start_time} - {selectedEvent.end_time}</p>
                {selectedEvent.description && (
                  <div>
                    <strong className="block mb-1">Description:</strong>
                    <p className="whitespace-pre-wrap bg-slate-50 p-3 rounded-md border border-slate-200">{selectedEvent.description}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button onClick={() => setSelectedEvent(null)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                  Close
                </button>
                {isStaff && currentUserId === selectedEvent.created_by && (
                  <button
                    onClick={() => handleDeleteSchedule(selectedEvent.id)}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:bg-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                    {loading ? 'Deleting...' : 'Delete'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
