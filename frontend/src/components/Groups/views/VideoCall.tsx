import React, { useState, useEffect, useRef } from 'react';
import { Video, VideoOff, Mic, MicOff, Phone, Monitor, Settings, Users, Maximize2, MessageSquare, MoreVertical, Send, X } from 'lucide-react';
import { supabase } from '../../../supabaseClient';

interface Participant {
  id: string;
  name: string;
  isMuted: boolean;
  isVideoOn: boolean;
  isSpeaking?: boolean;
}

interface ChatMessage {
  id: string;
  text: string;
  sender_name: string;
  created_at: string;
  is_self: boolean;
}

interface VideoCallProps {
  isOpen: boolean;
  onClose: () => void;
  groupName?: string;
  groupId?: string;
  currentUserName?: string;
  currentUserId?: string;
}

export const VideoCall: React.FC<VideoCallProps> = ({ 
  isOpen, 
  onClose, 
  groupName = 'Group Call',
  groupId,
  currentUserName = 'You',
  currentUserId
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const [participants] = useState<Participant[]>([
    { id: '1', name: currentUserName, isMuted: false, isVideoOn: true, isSpeaking: true },
    { id: '2', name: 'Alex Johnson', isMuted: false, isVideoOn: true },
    { id: '3', name: 'Sarah Miller', isMuted: true, isVideoOn: true, isSpeaking: false },
    { id: '4', name: 'Mike Chen', isMuted: false, isVideoOn: false },
  ]);

  // Timer for call duration
  useEffect(() => {
    if (!isOpen) {
      setCallDuration(0);
      return;
    }
    
    const interval = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isOpen]);

  // Fetch messages when chat is opened
  useEffect(() => {
    if (!isChatOpen || !groupId) return;
    
    const fetchMessages = async () => {
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
          .order('created_at', { ascending: true })
          .limit(50);

        if (error) throw error;

        const formattedMessages: ChatMessage[] = (data || []).map(msg => {
          const userData = Array.isArray(msg.users) ? msg.users[0] : msg.users;
          return {
            id: msg.id,
            text: msg.text,
            sender_name: userData?.full_name || 'Unknown',
            created_at: msg.created_at,
            is_self: msg.user_id === currentUserId
          };
        });

        setMessages(formattedMessages);
      } catch (err) {
        console.error('Error loading chat messages:', err);
      }
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`call-chat:${groupId}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `group_id=eq.${groupId}` },
        () => fetchMessages()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isChatOpen, groupId, currentUserId]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !currentUserId || !groupId) return;

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
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getGridClass = () => {
    const count = participants.length + 1;
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count <= 4) return 'grid-cols-2';
    if (count <= 6) return 'grid-cols-3';
    return 'grid-cols-4';
  };

  const getAvatarColor = (id: string) => {
    const colors = [
      'from-blue-500 to-blue-700',
      'from-purple-500 to-purple-700',
      'from-green-500 to-green-700',
      'from-orange-500 to-orange-700',
      'from-pink-500 to-pink-700',
      'from-indigo-500 to-indigo-700',
    ];
    return colors[parseInt(id) % colors.length];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-black/30 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-white font-medium">{groupName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-300 bg-white/10 px-3 py-1.5 rounded-full">
            <Users className="w-4 h-4" />
            <span>{participants.length + 1}</span>
          </div>
          <div className="text-sm text-red-400 font-mono">
            {formatDuration(callDuration)}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <Maximize2 className="w-5 h-5 text-gray-300" />
          </button>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-gray-300" />
          </button>
        </div>
      </div>

      {/* Main Content - Video Grid + Chat Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Grid */}
        <div className={`flex-1 p-6 overflow-auto ${isChatOpen ? 'pr-0' : ''}`}>
          <div className={`grid ${getGridClass()} gap-4 h-full auto-rows-fr`}>
            {/* Self Video */}
            <div className="relative aspect-video bg-gray-800 rounded-2xl overflow-hidden ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-900">
              {isVideoOn ? (
                <div className={`w-full h-full bg-gradient-to-br ${getAvatarColor('1')} flex items-center justify-center`}>
                  <span className="text-6xl font-bold text-white/90">
                    {currentUserName.charAt(0).toUpperCase()}
                  </span>
                </div>
              ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                  <VideoOff className="w-16 h-16 text-gray-600" />
                </div>
              )}
              
              <div className="absolute bottom-3 left-3 flex items-center gap-2">
                <span className="bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg text-white text-sm font-medium">
                  {currentUserName} (You)
                </span>
                {isMuted && (
                  <span className="bg-red-500/80 p-1.5 rounded-lg">
                    <MicOff className="w-3 h-3 text-white" />
                  </span>
                )}
              </div>
              
              {true && (
                <div className="absolute inset-0 ring-2 ring-green-500 rounded-2xl animate-pulse" />
              )}
            </div>

            {/* Other Participants */}
            {participants.map((participant) => (
              <div 
                key={participant.id}
                className="relative aspect-video bg-gray-800 rounded-2xl overflow-hidden hover:ring-2 hover:ring-blue-400 transition-all"
              >
                {participant.isVideoOn ? (
                  <div className={`w-full h-full bg-gradient-to-br ${getAvatarColor(participant.id)} flex items-center justify-center`}>
                    <span className="text-5xl font-bold text-white/90">
                      {participant.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                ) : (
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                    <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${getAvatarColor(participant.id)} flex items-center justify-center`}>
                      <span className="text-3xl font-bold text-white">
                        {participant.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                  <span className="bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg text-white text-sm font-medium">
                    {participant.name}
                  </span>
                  {participant.isMuted && (
                    <span className="bg-red-500/80 p-1.5 rounded-lg">
                      <MicOff className="w-3 h-3 text-white" />
                    </span>
                  )}
                </div>

                {participant.isSpeaking && (
                  <div className="absolute inset-0 ring-2 ring-green-500 rounded-2xl" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Chat Sidebar */}
        {isChatOpen && (
          <div className="w-80 bg-gray-800/90 backdrop-blur-md border-l border-gray-700 flex flex-col">
            {/* Chat Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <h3 className="text-white font-semibold">In-call Messages</h3>
              <button 
                onClick={() => setIsChatOpen(false)}
                className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Messages */}
            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-3"
            >
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-8">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex ${msg.is_self ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] ${
                      msg.is_self 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-700 text-white'
                    } px-3 py-2 rounded-lg`}>
                      {!msg.is_self && (
                        <div className="text-xs text-blue-300 mb-1">{msg.sender_name}</div>
                      )}
                      <div className="text-sm">{msg.text}</div>
                      <div className={`text-xs mt-1 ${msg.is_self ? 'text-blue-200' : 'text-gray-400'}`}>
                        {formatTime(msg.created_at)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={sending}
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg transition-colors"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-center gap-4 px-6 py-6 bg-black/40 backdrop-blur-md">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`p-4 rounded-full transition-all transform hover:scale-105 ${
            isMuted 
              ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30' 
              : 'bg-gray-700 hover:bg-gray-600 shadow-lg'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
        </button>

        <button
          onClick={() => setIsVideoOn(!isVideoOn)}
          className={`p-4 rounded-full transition-all transform hover:scale-105 ${
            !isVideoOn 
              ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30' 
              : 'bg-gray-700 hover:bg-gray-600 shadow-lg'
          }`}
          title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
        >
          {isVideoOn ? <Video className="w-6 h-6 text-white" /> : <VideoOff className="w-6 h-6 text-white" />}
        </button>

        <button
          onClick={() => setIsScreenSharing(!isScreenSharing)}
          className={`p-4 rounded-full transition-all transform hover:scale-105 ${
            isScreenSharing 
              ? 'bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/30' 
              : 'bg-gray-700 hover:bg-gray-600 shadow-lg'
          }`}
          title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
        >
          <Monitor className="w-6 h-6 text-white" />
        </button>

        <div className="w-px h-10 bg-gray-600 mx-2" />

        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`p-4 rounded-full transition-all transform hover:scale-105 ${
            isChatOpen 
              ? 'bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/30' 
              : 'bg-gray-700 hover:bg-gray-600 shadow-lg'
          }`}
          title="Chat"
        >
          <MessageSquare className="w-6 h-6 text-white" />
        </button>

        <button
          className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition-all transform hover:scale-105 shadow-lg"
          title="Settings"
        >
          <Settings className="w-6 h-6 text-white" />
        </button>

        <div className="w-px h-10 bg-gray-600 mx-2" />

        <button
          onClick={onClose}
          className="p-5 rounded-full bg-red-500 hover:bg-red-600 transition-all transform hover:scale-105 shadow-lg shadow-red-500/30"
          title="Leave call"
        >
          <Phone className="w-6 h-6 text-white rotate-[135deg]" />
        </button>
      </div>
    </div>
  );
};

export default VideoCall;
