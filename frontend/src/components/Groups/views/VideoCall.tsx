import React, { useState, useEffect, useRef } from 'react';
import { Video, VideoOff, Mic, MicOff, Phone, Monitor, Settings, Users, Maximize2, MessageSquare, MoreVertical, Send, X, Volume2, VolumeX } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import AgoraRTC, { 
  AgoraRTCProvider, 
  useJoin, 
  useLocalMicrophoneTrack, 
  useLocalCameraTrack,
  usePublish, 
  useRemoteUsers, 
  useRTCClient,
  RemoteUser,
  LocalUser 
} from "agora-rtc-react";

// Initialize client outside of the component
const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

interface VideoCallProps {
  isOpen: boolean;
  onClose: () => void;
  groupName?: string;
  groupId?: string;
  currentUserName?: string;
  currentUserId?: string;
}

export const VideoCall: React.FC<VideoCallProps> = (props) => {
  return (
    <AgoraRTCProvider client={client}>
      <VideoCallInner {...props} />
    </AgoraRTCProvider>
  );
};

const VideoCallInner: React.FC<VideoCallProps> = ({ 
  isOpen, 
  onClose, 
  groupName = 'Group Call',
  groupId,
  currentUserName = 'You',
  currentUserId
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [hasInteracted, setHasInteracted] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [audioVolumes, setAudioVolumes] = useState<Record<string, number>>({});
  
  // Get the RTC client for manual subscription
  const agoraClient = useRTCClient(client);
  
  // --- AGORA HOOKS ---
  // Join the channel automatically when the modal is open
  useJoin({
    appid: import.meta.env.VITE_AGORA_APP_ID,
    channel: groupId || "test-room",
    token: null, 
  }, isOpen);

  const { localMicrophoneTrack } = useLocalMicrophoneTrack(!isMuted);
  const { localCameraTrack } = useLocalCameraTrack(isVideoOn);
  
  // Publish our tracks so others can see/hear us
  usePublish([localMicrophoneTrack, localCameraTrack]);
  
  // Get all other people in the call
  const remoteUsers = useRemoteUsers();

  // Manual audio subscription - ensures audio is properly subscribed and played
  useEffect(() => {
    if (!isOpen) return;

    const handleUserPublished = async (user: any, mediaType: 'audio' | 'video') => {
      console.log("User published:", user.uid, mediaType);
      try {
        await agoraClient.subscribe(user, mediaType);
        console.log("Subscribed to", mediaType, "for user", user.uid);
        
        if (mediaType === 'audio' && user.audioTrack) {
          console.log("Playing audio for user", user.uid);
          user.audioTrack.play();
          setAudioReady(true);
        }
      } catch (error) {
        console.error("Failed to subscribe:", error);
      }
    };

    agoraClient.on("user-published", handleUserPublished);

    return () => {
      agoraClient.off("user-published", handleUserPublished);
    };
  }, [isOpen, agoraClient]);

  // Audio volume monitoring for visual debug
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      const volumes: Record<string, number> = {};
      remoteUsers.forEach((user) => {
        if (user.audioTrack) {
          try {
            volumes[user.uid] = user.audioTrack.getVolumeLevel?.() || 0;
          } catch (e) {
            volumes[user.uid] = 0;
          }
        }
      });
      setAudioVolumes(volumes);
    }, 100);

    return () => clearInterval(interval);
  }, [isOpen, remoteUsers]);

  // Handle Mute/Video toggle at the hardware level
  useEffect(() => {
    localMicrophoneTrack?.setEnabled(!isMuted);
  }, [isMuted, localMicrophoneTrack]);

  useEffect(() => {
    localCameraTrack?.setEnabled(isVideoOn);
  }, [isVideoOn, localCameraTrack]);

  // Cleanup: Close camera/mic tracks when modal closes or component unmounts
  useEffect(() => {
    return () => {
      // Explicitly close tracks to turn off hardware
      if (localCameraTrack) {
        localCameraTrack.stop();
        localCameraTrack.close();
      }
      if (localMicrophoneTrack) {
        localMicrophoneTrack.stop();
        localMicrophoneTrack.close();
      }
    };
  }, [localCameraTrack, localMicrophoneTrack]);

  // Handle browser autoplay policy - listen for first user interaction to enable audio
  useEffect(() => {
    if (!isOpen || hasInteracted) return;

    const handleInteraction = () => {
      setHasInteracted(true);
      // Resume all audio tracks after user interaction
      remoteUsers.forEach((user) => {
        if (user.audioTrack) {
          user.audioTrack.play();
        }
      });
    };

    document.addEventListener('click', handleInteraction);
    document.addEventListener('keydown', handleInteraction);

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };
  }, [isOpen, hasInteracted, remoteUsers]);

  // Timer logic
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => setCallDuration(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white">
      {/* Join Audio Overlay - Required for browser autoplay policy */}
      {!hasInteracted && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-600 flex items-center justify-center">
              <Volume2 size={40} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Join Audio</h2>
            <p className="text-gray-400 mb-6">Click to enable audio playback</p>
            <button 
              onClick={() => {
                setHasInteracted(true);
                remoteUsers.forEach((user) => {
                  if (user.audioTrack) {
                    user.audioTrack.play();
                  }
                });
              }}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-full font-semibold transition"
            >
              Enable Audio
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-black/20 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="font-semibold">{groupName}</span>
          </div>
          <div className="text-sm font-mono text-gray-400">{Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, '0')}</div>
        </div>
        <div className="flex gap-3">
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-xs">
                <Users size={14}/> {remoteUsers.length + 1} online
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X size={20}/></button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
          
      {/* My Video Card */}
      <div className="relative bg-slate-900 rounded-3xl overflow-hidden border border-white/5 shadow-2xl transition-all duration-500">
        {isVideoOn ? (
          /* Apply styling to this wrapper div instead of the LocalUser component */
          <div className="w-full h-full">
            <LocalUser
              audioTrack={localMicrophoneTrack}
              videoTrack={localCameraTrack}
              cameraOn={isVideoOn}
              micOn={!isMuted}
              playAudio={false}
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-800">
            <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-4xl font-bold shadow-2xl uppercase">
              {currentUserName.charAt(0)}
            </div>
          </div>
        )}
        
        <div className="absolute bottom-5 left-5 bg-black/40 backdrop-blur-lg px-4 py-1.5 rounded-xl text-xs font-semibold border border-white/10 flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${!isMuted ? 'bg-green-500' : 'bg-red-500'}`} />
          {currentUserName} (You)
        </div>
      </div>

          {/* Remote Participants */}
          {remoteUsers.map((user) => (
            <div key={user.uid} className="relative w-full h-full bg-slate-900 rounded-2xl overflow-hidden border border-white/10">
              <RemoteUser user={user} playAudio={true} playVideo={true} />
              {/* Audio Signal Indicator - Visual Debug */}
              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                {user.hasAudio ? (
                  <div className="flex items-center gap-1.5 bg-green-500/20 px-3 py-1 rounded-full text-xs text-green-400 border border-green-500/30">
                    <div className="flex items-end gap-0.5 h-4">
                      <div 
                        className="w-1 bg-green-400 rounded-full" 
                        style={{ height: `${Math.min(100, (audioVolumes[user.uid] || 0) * 100)}%`, transition: 'height 0.1s' }} 
                      />
                      <div 
                        className="w-1 bg-green-400 rounded-full" 
                        style={{ height: `${Math.min(100, (audioVolumes[user.uid] || 0) * 100 * 0.8)}%`, transition: 'height 0.1s' }} 
                      />
                      <div 
                        className="w-1 bg-green-400 rounded-full" 
                        style={{ height: `${Math.min(100, (audioVolumes[user.uid] || 0) * 100 * 0.6)}%`, transition: 'height 0.1s' }} 
                      />
                    </div>
                    <span className="ml-1">{(audioVolumes[user.uid] || 0).toFixed(1)}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 bg-red-500/20 px-3 py-1 rounded-full text-xs text-red-400 border border-red-500/30">
                    <VolumeX size={14} />
                    No Audio
                  </div>
                )}
              </div>
              <div className="absolute top-4 right-4 bg-black/50 px-3 py-1 rounded-md text-sm">
                User {user.uid}
              </div>
            </div>
          ))}
        </div>

        {/* Chat Sidebar (Simplified for brevity) */}
        {isChatOpen && (
          <div className="w-80 bg-slate-900 rounded-2xl border border-white/10 flex flex-col overflow-hidden">
             <div className="p-4 border-b border-white/10 font-bold">In-call Chat</div>
             <div className="flex-1 p-4 overflow-y-auto text-sm text-gray-400">
                Messages will appear here...
             </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-6 bg-black/40 flex justify-center items-center gap-4">
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className={`p-4 rounded-full transition ${isMuted ? 'bg-red-500' : 'bg-white/10 hover:bg-white/20'}`}
        >
          {isMuted ? <MicOff /> : <Mic />}
        </button>

        <button 
          onClick={() => setIsVideoOn(!isVideoOn)}
          className={`p-4 rounded-full transition ${!isVideoOn ? 'bg-red-500' : 'bg-white/10 hover:bg-white/20'}`}
        >
          {isVideoOn ? <Video /> : <VideoOff />}
        </button>

        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`p-4 rounded-full transition ${isChatOpen ? 'bg-blue-500' : 'bg-white/10 hover:bg-white/20'}`}
        >
          <MessageSquare />
        </button>

        <button onClick={onClose} className="p-4 rounded-full bg-red-600 hover:bg-red-700 ml-10">
          <Phone className="rotate-[135deg]" />
        </button>
      </div>
    </div>
  );
};