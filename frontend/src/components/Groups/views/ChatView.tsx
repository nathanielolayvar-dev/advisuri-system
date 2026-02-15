import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, ArrowDown, Link as LinkIcon, File, X, FileText, Image, FileSpreadsheet, Code } from 'lucide-react';
import { Message, Document } from '../../../shared/types';
import '../../../styles/ChatView.css';
import api from '../../../api';

interface ChatViewProps {
  groupId: string | number;
}

// File type icons component
const FileTypeIcon = ({ type }: { type: string }) => {
  const iconClass = "w-5 h-5";
  switch (type) {
    case 'pdf': return <FileText className={iconClass} />;
    case 'excel': return <FileSpreadsheet className={iconClass} />;
    case 'doc': return <FileText className={iconClass} />;
    case 'code': return <Code className={iconClass} />;
    case 'image': return <Image className={iconClass} />;
    default: return <File className={iconClass} />;
  }
};

export const ChatView = ({ groupId }: ChatViewProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showScrollBadge, setShowScrollBadge] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch messages from the backend
  const fetchMessages = async () => {
    if (!groupId) return;
    try {
      const response = await api.get(`/api/messages/?group=${groupId}`);
      setMessages(response.data);
    } catch (err) {
      console.error('Error loading chat:', err);
    }
  };

  // Fetch documents from the backend
  const fetchDocuments = async () => {
    if (!groupId) return;
    try {
      const response = await api.get(`/api/documents/?group=${groupId}`);
      setDocuments(response.data);
    } catch (err) {
      console.error('Error loading documents:', err);
    }
  };

  // Load messages and documents when group changes
  useEffect(() => {
    fetchMessages();
    fetchDocuments();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [groupId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const isAtBottom =
      container.scrollHeight - container.scrollTop <=
      container.clientHeight + 100;

    if (isAtBottom) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      setShowScrollBadge(false);
    } else {
      setShowScrollBadge(true);
    }
  }, [messages]);

  // Handle manual scroll
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleManualScroll = () => {
      const nearBottom =
        container.scrollHeight - container.scrollTop <=
        container.clientHeight + 50;
      if (nearBottom) {
        setShowScrollBadge(false);
      }
    };

    container.addEventListener('scroll', handleManualScroll);
    return () => container.removeEventListener('scroll', handleManualScroll);
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const res = await api.post(`/api/messages/`, {
        text: newMessage,
        group: groupId,
      });
      setMessages((prev) => [...prev, { ...res.data, is_self: true }]);
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send:', err);
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('group', groupId.toString());
    formData.append('name', file.name);

    try {
      const response = await api.post('/api/documents/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDocuments((prev) => [...prev, response.data]);
      setShowDocuments(true);
    } catch (err) {
      console.error('Failed to upload file:', err);
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteDocument = async (docId: number) => {
    try {
      await api.delete(`/api/documents/delete/${docId}/`);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const formatFileSize = (size: string) => {
    return size || '0 KB';
  };

  return (
    <div className="chat-container">
      {/* Documents Panel Toggle */}
      <div className="documents-toggle">
        <button
          onClick={() => setShowDocuments(!showDocuments)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            showDocuments 
              ? 'bg-blue-100 text-blue-700' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <LinkIcon size={16} />
          <span className="text-sm font-medium">
            {showDocuments ? 'Hide Links & Docs' : `Links & Docs (${documents.length})`}
          </span>
        </button>
      </div>

      {/* Documents Panel */}
      {showDocuments && (
        <div className="documents-panel">
          <div className="documents-header">
            <h3>
              <LinkIcon size={16} />
              Group Documents
            </h3>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              <Paperclip size={14} />
              Upload
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
          <div className="documents-list">
            {documents.length === 0 ? (
              <div className="text-center py-8">
                <FileText size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-400">No documents yet</p>
                <p className="text-xs text-slate-300 mt-1">Upload files to share with your group</p>
              </div>
            ) : (
              documents.map((doc) => (
                <div key={doc.id} className="document-item">
                  <div className={`document-icon ${doc.file_type || 'other'}`}>
                    <FileTypeIcon type={doc.file_type || 'other'} />
                  </div>
                  <div className="document-name">
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {doc.name}
                    </a>
                    <div className="document-meta">
                      {formatFileSize(doc.file_size || '')}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteDocument(doc.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="messages-list custom-scrollbar">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <MessageSquare />
            <h3>No messages yet</h3>
            <p>Start the conversation by sending a message!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`message-row ${msg.is_self ? 'self' : ''}`}
            >
              <div
                className="avatar"
                style={{ background: msg.avatar_color || '#6366f1' }}
              >
                {msg.sender_initials || msg.sender_name?.charAt(0).toUpperCase()}
              </div>

              <div className="message-content">
                {!msg.is_self && (
                  <span className="sender-name">{msg.sender_name}</span>
                )}
                <div className={`bubble ${msg.is_self ? 'self' : 'other'}`}>
                  {msg.text}
                </div>
                <span className="timestamp-text">
                  {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Scroll Badge */}
      {showScrollBadge && messages.length > 0 && (
        <button
          onClick={() => {
            scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
          }}
          className="scroll-badge"
        >
          <ArrowDown size={16} />
          New messages
        </button>
      )}

      {/* Input Bar */}
      <form onSubmit={handleSendMessage} className="input-bar">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="attach-btn"
          title="Attach file"
        >
          <Paperclip size={18} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileUpload}
        />
        <div className="chat-input-wrapper">
          <input
            className="chat-input"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={sending}
          />
        </div>
        <button type="submit" className="send-btn" disabled={!newMessage.trim() || sending}>
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

// Helper icon for empty state
const MessageSquare = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);
