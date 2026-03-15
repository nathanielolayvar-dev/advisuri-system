import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, ArrowDown, Link as LinkIcon, File, X, FileText, Image, FileSpreadsheet, Code } from 'lucide-react';
import { Message, Document } from '../../../shared/types';
import '../../../styles/ChatView.css';
import { supabase } from '../../../supabaseClient';


interface ChatViewProps {
  groupId: string;
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
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const docsFileInputRef = useRef<HTMLInputElement>(null);


  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getUserId();
  }, []);

  // Fetch messages from the backend
  const fetchMessages = async () => {
      if (!groupId) return;
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select(`
            id,
            text,
            created_at,
            user_id,
            users ( full_name )
          `)
          .eq('group_id', groupId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        const formattedMessages: Message[] = (data || []).map(msg => {
          // Handle the join array/object mismatch
          const userData = Array.isArray(msg.users) ? msg.users[0] : msg.users;
          const name = userData?.full_name || 'Unknown';

          return {
            id: msg.id,
            text: msg.text,
            timestamp: msg.created_at,
            sender_name: name,
            is_self: msg.user_id === currentUserId,
            sender_initials: name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
          };
        });

        setMessages(formattedMessages); // This actually updates the UI
      } catch (err) {
        console.error('Error loading chat:', err);
      }
    };


  // Load messages and documents when group changes
  useEffect(() => {
    fetchMessages();
    fetchDocuments(); // Added this back in since you have the function now

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`room:${groupId}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `group_id=eq.${groupId}` },
        () => fetchMessages()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [groupId, currentUserId]);

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
  if (!newMessage.trim() || sending || !currentUserId) return;

  setSending(true);
  try {
    const { error } = await supabase
      .from('chat_messages')
      .insert([{ 
        text: newMessage, 
        group_id: groupId, 
        user_id: currentUserId 
      }]);

    if (error) throw error;
    
    setNewMessage('');
    fetchMessages(); 
    
  } catch (err) {
    console.error('Failed to send:', err);
  } finally {
    setSending(false);
  }
};

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const resolveFileType = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (['pdf'].includes(ext)) return 'pdf';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'excel';
    if (['doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) return 'doc';
    if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(ext)) return 'image';
    if (['js', 'ts', 'py', 'java', 'c', 'cpp', 'cs', 'rb', 'go', 'php', 'html', 'css', 'json', 'yaml', 'yml'].includes(ext)) return 'code';
    return 'other';
  };

  const isImageUrl = (url: string) => {
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg'];
    const lower = url.toLowerCase().split('?')[0];
    return imageExtensions.some(ext => lower.endsWith(ext));
  };

  const extractUrlFromText = (text: string) => {
    const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
    if (!urlMatch) return null;

    const url = urlMatch[1];
    const isImage = isImageUrl(url);

    // Try to extract a label from messages like:
    // "Uploaded document: filename.ext https://..."
    const labelMatch = text.match(/Uploaded document:\s*(.+?)\s+https?:\/\//i);
    const label = labelMatch ? labelMatch[1].trim() : null;

    return { url, label, isImage };
  };

  const renderMessageText = (text: string) => {
    const link = extractUrlFromText(text);
    if (!link) return <span>{text}</span>;

    // If the link points to an image, render it directly in the chat bubble
    if (link.isImage) {
      return (
        <div className="message-image-wrapper">
          <img className="message-image" src={link.url} alt={link.label || 'Image'} />
          {link.label && <div className="message-image-label">{link.label}</div>}
        </div>
      );
    }

    return (
      <div className="link-card">
        <div className="link-card-icon">
          <LinkIcon size={16} />
        </div>
        <div className="link-card-body">
          <a
            className="link-card-title link-card-url"
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {link.label || 'Link'}
          </a>
        </div>
      </div>
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (!files || files.length === 0 || !groupId || !currentUserId) return;

    setSending(true);
    setUploadStatus('Uploading...');

    try {
      const bucketName = 'capstone_submissions';
      const fileArray = Array.from(files) as File[];

      for (const file of fileArray) {
        const filePath = `${groupId}/${currentUserId}/${Date.now()}_${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath);

        const { error: insertError } = await supabase.from('documents').insert([{
          group_id: groupId,
          name: file.name,
          file_url: publicUrlData.publicUrl,
          file_type: resolveFileType(file.name),
          file_size: formatBytes(file.size),
          uploaded_by: currentUserId,
        }]);

        if (insertError) throw insertError;

        const uploadMessage = `Uploaded document: ${file.name} ${publicUrlData.publicUrl}`;
        const { error: messageError } = await supabase.from('chat_messages').insert([{
          text: uploadMessage,
          group_id: groupId,
          user_id: currentUserId,
        }]);

        if (messageError) throw messageError;
      }

      setUploadStatus('Upload complete');
      fetchDocuments();
      fetchMessages();
    } catch (err) {
      console.error('Failed to upload document:', err);
      setUploadStatus('Upload failed (see console)');
    } finally {
      setSending(false);
      // Reset the file inputs so the same file can be re-selected
      if (chatFileInputRef.current) chatFileInputRef.current.value = '';
      if (docsFileInputRef.current) docsFileInputRef.current.value = '';

      window.setTimeout(() => setUploadStatus(null), 2500);
    }
  };

  // Fetch documents from Supabase
  const fetchDocuments = async () => {
    if (!groupId) return;

    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('group_id', groupId);

      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      console.error('Error loading documents:', err);
    }
  };

  const handleDeleteDocument = async (docId: string | number) => {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', docId);

      if (error) throw error;
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
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
            <label
              className={`flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors ${sending ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Upload document"
            >
              <Paperclip size={14} />
              Upload
              <input
                ref={docsFileInputRef}
                type="file"
                multiple
                onChange={handleFileUpload}
                className="sr-only"
                disabled={sending}
              />
            </label>
            {uploadStatus && (
              <span className="text-xs text-slate-400 ml-2">{uploadStatus}</span>
            )}
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
                      {formatBytes(Number(doc.file_size) || 0)}
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
                  {renderMessageText(msg.text)}
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
        <label
          className={`attach-btn ${sending ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Attach file"
        >
          <Paperclip size={18} />
          <input
            ref={chatFileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            className="sr-only"
            disabled={sending}
          />
        </label>
        <div className="chat-input-wrapper">
          <input
            className="chat-input"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={sending}
          />
          {uploadStatus && (
            <span className="text-xs text-slate-400 mt-1">{uploadStatus}</span>
          )}
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
