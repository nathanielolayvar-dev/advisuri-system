import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, ArrowDown, User, Hash } from 'lucide-react';
import { Message } from '../../../shared/types';
import '../../../styles/ChatView.css';
import api from '../../../api';

export const ChatView = ({ groupId }: { groupId: number }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showScrollBadge, setShowScrollBadge] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  //Fetch history from the backend
  const fetchMessages = async () => {
    if (!groupId) return;
    try {
      const response = await api.get(`/api/messages/?group=${groupId}`);
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
  }, [groupId]);

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
        group: groupId,
      });
      // Append new message to local state
      setMessages((prev) => [...prev, { ...res.data, is_self: true }]);
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send:', err);
    }
  };

  return (
    <div className="chat-container">
      <div ref={scrollRef} className="messages-list custom-scrollbar">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`message-row ${msg.is_self ? 'self' : ''}`}
          >
            <div
              className="avatar"
              style={{ backgroundColor: msg.avatar_color }}
            >
              {msg.sender_initials}
            </div>

            <div
              className={`flex flex-col ${msg.is_self ? 'items-end' : 'items-start'}`}
            >
              <div className={`bubble ${msg.is_self ? 'self' : 'other'}`}>
                {msg.text}
              </div>
              <span className="timestamp-text">{/* Time logic */}</span>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSendMessage} className="input-bar">
        <input
          className="chat-input"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button type="submit" className="send-btn">
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};
