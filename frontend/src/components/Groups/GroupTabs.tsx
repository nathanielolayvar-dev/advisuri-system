import React, { useState } from 'react';
import { MessageSquare, FileText, Calendar, Video } from 'lucide-react';
import { ChatView } from './views/ChatView';
import { NotesView } from './views/NotesView'; // Our newly integrated view
import { TimelineView } from './views/TimelineView';
import { Group } from './types';

interface GroupTabsProps {
  selectedGroup: Group;
  setShowVideo: (show: boolean) => void;
}

export const GroupTabs = ({ selectedGroup, setShowVideo }: GroupTabsProps) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'notes' | 'timeline'>(
    'chat'
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-[#E2E8F0] overflow-hidden">
      {/* Header with Group Info */}
      <div className="p-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#F8FAFC]">
        <div>
          <h3 className="text-xl font-bold text-[#1E293B]">
            {selectedGroup.name}
          </h3>
          <p className="text-sm text-[#64748B]">{selectedGroup.course}</p>
        </div>
        <button
          onClick={() => setShowVideo(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#10B981] text-white rounded-lg font-semibold hover:bg-[#059669] transition-colors"
        >
          <Video className="w-4 h-4" />
          Join Video Call
        </button>
      </div>

      {/* Navigation */}
      <div className="flex border-b border-[#E2E8F0] px-2 bg-white">
        <TabButton
          active={activeTab === 'chat'}
          onClick={() => setActiveTab('chat')}
          icon={<MessageSquare className="w-4 h-4" />}
          label="Discussion"
        />
        <TabButton
          active={activeTab === 'notes'}
          onClick={() => setActiveTab('notes')}
          icon={<FileText className="w-4 h-4" />}
          label="Task Notes"
        />
        <TabButton
          active={activeTab === 'timeline'}
          onClick={() => setActiveTab('timeline')}
          icon={<Calendar className="w-4 h-4" />}
          label="Timeline"
        />
      </div>

      {/* Content Area - Now passing selectedGroup to views */}
      <div className="p-6">
        {activeTab === 'chat' && <ChatView selectedGroup={selectedGroup} />}
        {activeTab === 'notes' && <NotesView selectedGroup={selectedGroup} />}
        {activeTab === 'timeline' && (
          <TimelineView selectedGroup={selectedGroup} />
        )}
      </div>
    </div>
  );
};

// Simple internal component for cleaner tab buttons
const TabButton = ({ active, onClick, icon, label }: any) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all relative ${
      active ? 'text-[#2563EB]' : 'text-[#64748B] hover:text-[#1E293B]'
    }`}
  >
    {icon}
    {label}
    {active && (
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563EB]" />
    )}
  </button>
);
