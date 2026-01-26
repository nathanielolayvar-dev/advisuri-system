import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, ArrowDown } from 'lucide-react';
import { Message } from '../../../shared/types';
import api from '../../../api';

export const ChatView = ({ selectedGroup }: { selectedGroup: any }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showScrollBadge, setShowScrollBadge] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  //Fetch history from the backend
  const fetchMessages = async () => {
    if (!selectedGroup?.id) return;
    try {
      const response = await api.get(
        `/api/messages/?group=${selectedGroup.id}`
      );
      setMessages(response.data);
    } catch (err) {
      console.error('Error loading chat:', err);
    }
  };

  // Helper to format date for the divider
  const formatDateLabel = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return date.toLocaleDateString([], {
      month: 'long',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  };

  //First effect, Ear: It listens for new data from the server.
  //Load messages when group changes
  useEffect(() => {
    //Initial fetch when group changes
    fetchMessages();
    //Set up polling to check for new messages every 3 seconds
    const interval = setInterval(fetchMessages, 3000);
    //Cleanup
    return () => clearInterval(interval);
  }, [selectedGroup.id]);

  //Second effect, Eye: It moves the camera when it sees something new.
  // Auto-scroll to bottom on new messages
  useEffect(() => {
    //Dedicated Scroll Watcher
    // Only fires when the content actually changes
    const container = scrollRef.current;
    if (!container) return;

    // Check if user is near the bottom (within 100px)
    const isAtBottom =
      container.scrollHeight - container.scrollTop <=
      container.clientHeight + 100;

    if (isAtBottom) {
      // If they are at the bottom, just scroll normally
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      setShowScrollBadge(false);
    } else {
      // If they are scrolled up, show the "New Message" badge instead of jumping
      setShowScrollBadge(true);
    }
  }, [messages]); // Only fires when messages array updates

  //Handle Manual Scroll: Hide the badge if the user scrolls to the bottom themselves
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleManualScroll = () => {
      // If the user scrolls manually to within 50px of the bottom, hide the badge
      const nearBottom =
        container.scrollHeight - container.scrollTop <=
        container.clientHeight + 50;
      if (nearBottom) {
        setShowScrollBadge(false);
      }
    };

    container.addEventListener('scroll', handleManualScroll);
    return () => container.removeEventListener('scroll', handleManualScroll);
  }, []); // Empty dependency: only set this listener up once

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      // Sending to Django
      const res = await api.post(`/api/messages/`, {
        text: newMessage,
        group: selectedGroup.id,
      });
      // Append new message to local state
      setMessages([...messages, { ...res.data, is_self: true }]);
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send:', err);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] overflow-hidden">
      {/* Messages List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, index) => {
          // Logic for Date Divider
          const prevMsg = messages[index - 1];
          const currentDate = new Date(msg.timestamp).toDateString();
          const prevDate = prevMsg
            ? new Date(prevMsg.timestamp).toDateString()
            : null;
          const showDivider = currentDate !== prevDate;

          return (
            <React.Fragment key={msg.id}>
              {/* Date Divider UI */}
              {showDivider && (
                <div className="flex items-center my-8 opacity-80">
                  <div className="flex-1 border-t border-[#E2E8F0]"></div>
                  <span className="px-4 text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">
                    {formatDateLabel(msg.timestamp)}
                  </span>
                  <div className="flex-1 border-t border-[#E2E8F0]"></div>
                </div>
              )}

              {/* Message Bubble Container */}
              <div
                className={`flex items-end gap-3 ${msg.is_self ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar Circle */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm"
                  style={{ backgroundColor: msg.avatar_color }}
                >
                  {msg.sender_initials}
                </div>

                {/* Content Group */}
                <div
                  className={`flex flex-col max-w-[70%] ${msg.is_self ? 'items-end' : 'items-start'}`}
                >
                  {!msg.is_self && (
                    <span className="text-xs font-semibold text-[#64748B] mb-1 ml-1">
                      {msg.sender_name}
                    </span>
                  )}

                  <div
                    className={`p-4 rounded-2xl text-sm shadow-sm ${
                      msg.is_self
                        ? 'bg-[#2563EB] text-white rounded-br-none'
                        : 'bg-white text-[#334155] border border-[#E2E8F0] rounded-bl-none'
                    }`}
                  >
                    {msg.text}
                  </div>

                  <span className="text-[10px] text-[#94A3B8] mt-1 px-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Floating Badge with Icon and Smooth Fade*/}
      <div
        className={`relative h-0 w-full flex justify-center transition-all duration-300 ${
          showScrollBadge
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <button
          onClick={() => {
            scrollRef.current?.scrollTo({
              top: scrollRef.current.scrollHeight,
              behavior: 'smooth',
            });
            setShowScrollBadge(false);
          }}
          className="absolute bottom-4 z-20 bg-[#2563EB] text-white px-5 py-2.5 rounded-full shadow-2xl text-xs font-bold flex items-center gap-2 animate-bounce border-2 border-white hover:bg-[#1D4ED8] active:scale-95 transition-all"
        >
          <ArrowDown className="w-4 h-4" />
          <span>New Messages</span>
        </button>
      </div>

      {/* Input Bar */}
      <form
        onSubmit={handleSendMessage}
        className="p-4 bg-white border-t border-[#E2E8F0] flex gap-3 items-center"
      >
        <button
          type="button"
          className="p-2 text-[#94A3B8] hover:text-[#64748B] transition-colors"
        >
          <Paperclip className="w-5 h-5" />
        </button>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 py-3 px-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] text-sm"
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className="bg-[#2563EB] text-white p-3 rounded-xl hover:bg-[#1D4ED8] disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};
