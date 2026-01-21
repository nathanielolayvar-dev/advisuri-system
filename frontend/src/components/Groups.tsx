import { useState } from 'react';
import {
  MessageSquare,
  FileText,
  BarChart3,
  Upload,
  Send,
  Paperclip,
  Download,
  Calendar,
  CheckCircle2,
  Video,
  Users,
  Plus,
  X,
  Clock,
} from 'lucide-react';

// Mock data for groups
const groups = [
  {
    id: 1,
    name: 'CS101 - Group A',
    members: 5,
    course: 'Computer Science 101',
  },
  {
    id: 2,
    name: 'Business Management - Team 3',
    members: 4,
    course: 'Business Management',
  },
  {
    id: 3,
    name: 'Physics 201 - Lab Group B',
    members: 6,
    course: 'Physics 201',
  },
];

// Mock chat messages
const mockMessages = [
  {
    id: 1,
    sender: 'Sarah Kim',
    message: 'Hey everyone! Did you all review the project requirements?',
    time: '10:30 AM',
    isSelf: false,
    avatar: 'SK',
  },
  {
    id: 2,
    sender: 'You',
    message:
      'Yes, I went through them. We need to focus on the data analysis section.',
    time: '10:32 AM',
    isSelf: true,
    avatar: 'JD',
  },
  {
    id: 3,
    sender: 'Mike Chen',
    message: 'I can handle the data collection part. When should we meet?',
    time: '10:35 AM',
    isSelf: false,
    avatar: 'MC',
  },
  {
    id: 4,
    sender: 'Sarah Kim',
    message: 'How about tomorrow at 3 PM?',
    time: '10:36 AM',
    isSelf: false,
    avatar: 'SK',
  },
  {
    id: 5,
    sender: 'You',
    message: "Works for me! I'll prepare the analysis framework.",
    time: '10:38 AM',
    isSelf: true,
    avatar: 'JD',
  },
];

// Mock task notes
const mockTaskNotes = [
  {
    id: 1,
    title: 'Literature Review',
    content:
      'Research papers on machine learning algorithms. Focus on CNN and RNN architectures.',
    author: 'Sarah Kim',
    date: '2026-01-08',
    status: 'completed',
  },
  {
    id: 2,
    title: 'Data Collection Strategy',
    content:
      'Need to gather at least 1000 samples. Sources: Kaggle, UCI ML Repository.',
    author: 'Mike Chen',
    date: '2026-01-09',
    status: 'in-progress',
  },
  {
    id: 3,
    title: 'Analysis Framework',
    content:
      'Using Python with pandas and scikit-learn. Set up Jupyter notebooks for collaborative work.',
    author: 'You',
    date: '2026-01-10',
    status: 'in-progress',
  },
  {
    id: 4,
    title: 'Presentation Outline',
    content:
      'Introduction, Methodology, Results, Conclusion. Each section 5 minutes.',
    author: 'Sarah Kim',
    date: '2026-01-10',
    status: 'pending',
  },
];

// Mock gantt data for group project
const groupGanttData = [
  {
    task: 'Literature Review',
    startDay: 0,
    duration: 2,
    progress: 100,
    assignee: 'Sarah',
    color: '#3B82F6',
  },
  {
    task: 'Data Collection',
    startDay: 1,
    duration: 3,
    progress: 60,
    assignee: 'Mike',
    color: '#10B981',
  },
  {
    task: 'Data Analysis',
    startDay: 3,
    duration: 4,
    progress: 25,
    assignee: 'John',
    color: '#F59E0B',
  },
  {
    task: 'Report Writing',
    startDay: 5,
    duration: 3,
    progress: 0,
    assignee: 'Sarah',
    color: '#8B5CF6',
  },
  {
    task: 'Presentation Prep',
    startDay: 7,
    duration: 2,
    progress: 0,
    assignee: 'All',
    color: '#EF4444',
  },
];

// Mock documents
const mockDocuments = [
  {
    id: 1,
    name: 'Project_Proposal.pdf',
    uploadedBy: 'Sarah Kim',
    date: '2026-01-05',
    size: '2.3 MB',
    type: 'pdf',
  },
  {
    id: 2,
    name: 'Research_Data.xlsx',
    uploadedBy: 'Mike Chen',
    date: '2026-01-07',
    size: '1.8 MB',
    type: 'excel',
  },
  {
    id: 3,
    name: 'Analysis_Code.py',
    uploadedBy: 'You',
    date: '2026-01-09',
    size: '45 KB',
    type: 'code',
  },
  {
    id: 4,
    name: 'Meeting_Notes.docx',
    uploadedBy: 'Sarah Kim',
    date: '2026-01-10',
    size: '156 KB',
    type: 'doc',
  },
];

const totalDays = 9;

export default function Groups({
  userRole,
}: {
  userRole: 'student' | 'teacher';
}) {
  const [selectedGroup, setSelectedGroup] = useState(groups[0]);
  const [activeTab, setActiveTab] = useState<'chat' | 'notes' | 'timeline'>(
    'chat'
  );
  const [newMessage, setNewMessage] = useState('');
  const [newNote, setNewNote] = useState({ title: '', content: '' });
  const [showNewNoteForm, setShowNewNoteForm] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showVideoConference, setShowVideoConference] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    course: '',
    members: '',
  });

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      console.log('Sending message:', newMessage);
      setNewMessage('');
    }
  };

  const handleAddNote = () => {
    if (newNote.title.trim() && newNote.content.trim()) {
      console.log('Adding note:', newNote);
      setNewNote({ title: '', content: '' });
      setShowNewNoteForm(false);
    }
  };

  const handleCreateGroup = () => {
    if (newGroup.name.trim() && newGroup.course.trim()) {
      console.log('Creating group:', newGroup);
      setNewGroup({ name: '', course: '', members: '' });
      setShowCreateGroupModal(false);
    }
  };

  const getFileIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      pdf: '📄',
      excel: '📊',
      code: '💻',
      doc: '📝',
    };
    return icons[type] || '📎';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-[#D1FAE5] text-[#10B981]';
      case 'in-progress':
        return 'bg-[#DBEAFE] text-[#2563EB]';
      case 'pending':
        return 'bg-[#F1F5F9] text-[#64748B]';
      default:
        return 'bg-[#F1F5F9] text-[#64748B]';
    }
  };

  const getAvatarColor = (name: string) => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#1E293B]">My Groups</h2>
          <p className="text-[#64748B] mt-1">
            Collaborate with your team members
          </p>
        </div>
        <div className="flex gap-2">
          {userRole === 'teacher' && (
            <button
              onClick={() => setShowCreateGroupModal(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 font-semibold shadow-md"
            >
              <Plus className="w-4 h-4" />
              Create Group
            </button>
          )}
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#1E293B]">
                Create New Group
              </h3>
              <button
                onClick={() => setShowCreateGroupModal(false)}
                className="p-1.5 hover:bg-[#F8FAFC] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[#64748B]" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#1E293B] mb-2">
                  Group Name
                </label>
                <input
                  type="text"
                  value={newGroup.name}
                  onChange={(e) =>
                    setNewGroup({ ...newGroup, name: e.target.value })
                  }
                  placeholder="e.g., CS101 - Group A"
                  className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1E293B] mb-2">
                  Course
                </label>
                <input
                  type="text"
                  value={newGroup.course}
                  onChange={(e) =>
                    setNewGroup({ ...newGroup, course: e.target.value })
                  }
                  placeholder="e.g., Computer Science 101"
                  className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1E293B] mb-2">
                  Add Members (email addresses, separated by commas)
                </label>
                <textarea
                  value={newGroup.members}
                  onChange={(e) =>
                    setNewGroup({ ...newGroup, members: e.target.value })
                  }
                  placeholder="student1@email.com, student2@email.com"
                  rows={3}
                  className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white shadow-sm"
                />
              </div>
            </div>
            <div className="p-5 border-t border-[#E2E8F0] flex gap-2 justify-end">
              <button
                onClick={() => setShowCreateGroupModal(false)}
                className="px-4 py-2.5 bg-[#F8FAFC] text-[#64748B] rounded-lg hover:bg-[#F1F5F9] transition-colors font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                className="px-4 py-2.5 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white rounded-lg hover:opacity-90 transition-opacity font-semibold shadow-md"
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Conference Modal */}
      {showVideoConference && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full mx-4 h-[85vh] flex flex-col">
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#10B981] to-[#059669] rounded-lg flex items-center justify-center">
                  <Video className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1E293B]">
                    Video Conference
                  </h3>
                  <p className="text-sm text-[#64748B]">{selectedGroup.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowVideoConference(false)}
                className="p-2 hover:bg-white rounded-lg transition-colors border border-[#E2E8F0]"
              >
                <X className="w-5 h-5 text-[#64748B]" />
              </button>
            </div>
            <div className="flex-1 bg-[#0F172A] relative">
              {/* Main Video Area */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="w-20 h-20 bg-[#1E293B] rounded-full flex items-center justify-center mx-auto mb-4">
                    <Video className="w-10 h-10 text-[#64748B]" />
                  </div>
                  <p className="text-xl font-bold mb-2">
                    Video Conference Interface
                  </p>
                  <p className="text-sm text-[#94A3B8]">
                    Integration with Zoom, Google Meet, or WebRTC
                  </p>
                </div>
              </div>

              {/* Participant Thumbnails */}
              <div className="absolute bottom-6 left-6 right-6 flex gap-3 justify-center">
                {[
                  'You (JD)',
                  'Sarah Kim (SK)',
                  'Mike Chen (MC)',
                  'Emma Lee (EL)',
                ].map((participant, index) => (
                  <div key={index} className="relative">
                    <div className="w-36 h-28 bg-[#1E293B] rounded-lg border-2 border-[#334155] flex items-center justify-center shadow-xl overflow-hidden">
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold shadow-lg"
                        style={{ backgroundColor: getAvatarColor(participant) }}
                      >
                        {participant.match(/\(([^)]+)\)/)?.[1]}
                      </div>
                    </div>
                    <div className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-75 text-white text-xs py-1.5 px-2 rounded text-center font-medium">
                      {participant.split(' (')[0]}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-5 border-t border-[#E2E8F0] flex items-center justify-center gap-4 bg-[#F8FAFC]">
              <button className="w-12 h-12 bg-white hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-full flex items-center justify-center transition-colors shadow-sm">
                <Video className="w-5 h-5 text-[#64748B]" />
              </button>
              <button className="w-12 h-12 bg-white hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-full flex items-center justify-center transition-colors shadow-sm">
                <MessageSquare className="w-5 h-5 text-[#64748B]" />
              </button>
              <button className="w-14 h-14 bg-gradient-to-r from-[#DC2626] to-[#B91C1C] hover:opacity-90 rounded-full flex items-center justify-center transition-opacity shadow-lg">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Left Sidebar - Group List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-[#E2E8F0]">
            <div className="p-4 border-b border-[#E2E8F0]">
              <h3 className="font-bold text-[#1E293B]">Your Groups</h3>
            </div>
            <div className="divide-y divide-[#E2E8F0]">
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroup(group)}
                  className={`w-full text-left p-4 hover:bg-[#F8FAFC] transition-colors ${
                    selectedGroup.id === group.id
                      ? 'bg-gradient-to-r from-[#DBEAFE] to-[#BFDBFE] border-l-4 border-[#2563EB]'
                      : ''
                  }`}
                >
                  <h4 className="font-semibold text-[#1E293B] text-sm mb-1">
                    {group.name}
                  </h4>
                  <p className="text-xs text-[#64748B]">{group.course}</p>
                  <p className="text-xs text-[#94A3B8] mt-1.5 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {group.members} members
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm border border-[#E2E8F0]">
            {/* Group Header */}
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-gradient-to-r from-[#F8FAFC] to-white">
              <div>
                <h3 className="text-lg font-bold text-[#1E293B]">
                  {selectedGroup.name}
                </h3>
                <p className="text-sm text-[#64748B]">{selectedGroup.course}</p>
              </div>
              <button
                onClick={() => setShowVideoConference(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-[#10B981] to-[#059669] text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 font-semibold shadow-md"
              >
                <Video className="w-4 h-4" />
                Join Video Call
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <div className="flex px-2">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all font-semibold ${
                    activeTab === 'chat'
                      ? 'border-[#2563EB] text-[#2563EB] bg-white rounded-t-lg'
                      : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Chat & Documents</span>
                </button>

                <button
                  onClick={() => setActiveTab('notes')}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all font-semibold ${
                    activeTab === 'notes'
                      ? 'border-[#2563EB] text-[#2563EB] bg-white rounded-t-lg'
                      : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Task Notes</span>
                </button>

                <button
                  onClick={() => setActiveTab('timeline')}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all font-semibold ${
                    activeTab === 'timeline'
                      ? 'border-[#2563EB] text-[#2563EB] bg-white rounded-t-lg'
                      : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Timeline</span>
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-5">
              {/* Chat & Documents Tab - Split Screen */}
              {activeTab === 'chat' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Chat Section (Left) */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-[#1E293B] flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-[#2563EB]" />
                      Group Chat
                    </h4>
                    <div className="h-[500px] border border-[#E2E8F0] rounded-lg flex flex-col bg-white shadow-sm">
                      {/* Messages Area */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]">
                        {mockMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex gap-2 ${
                              msg.isSelf ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            {!msg.isSelf && (
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm"
                                style={{
                                  backgroundColor: getAvatarColor(msg.sender),
                                }}
                              >
                                {msg.avatar}
                              </div>
                            )}
                            <div className={`max-w-[70%]`}>
                              {!msg.isSelf && (
                                <p className="text-xs font-semibold text-[#64748B] mb-1">
                                  {msg.sender}
                                </p>
                              )}
                              <div
                                className={`rounded-lg p-3 shadow-sm ${
                                  msg.isSelf
                                    ? 'bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white'
                                    : 'bg-white text-[#1E293B] border border-[#E2E8F0]'
                                }`}
                              >
                                <p className="text-sm">{msg.message}</p>
                              </div>
                              <p className="text-xs text-[#94A3B8] mt-1 font-medium">
                                {msg.time}
                              </p>
                            </div>
                            {msg.isSelf && (
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm"
                                style={{
                                  backgroundColor: getAvatarColor(msg.sender),
                                }}
                              >
                                {msg.avatar}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Message Input */}
                      <div className="border-t border-[#E2E8F0] p-3 bg-white">
                        <div className="flex gap-2">
                          <button className="p-2.5 hover:bg-[#F8FAFC] rounded-lg transition-colors border border-[#E2E8F0]">
                            <Paperclip className="w-5 h-5 text-[#64748B]" />
                          </button>
                          <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={(e) =>
                              e.key === 'Enter' && handleSendMessage()
                            }
                            placeholder="Type a message..."
                            className="flex-1 px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] shadow-sm"
                          />
                          <button
                            onClick={handleSendMessage}
                            className="px-4 py-2.5 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white rounded-lg hover:opacity-90 transition-opacity shadow-md"
                          >
                            <Send className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Documents Section (Right) */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-[#1E293B] flex items-center gap-2">
                        <Upload className="w-5 h-5 text-[#2563EB]" />
                        Document Submission
                      </h4>
                      <button className="px-3 py-1.5 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-semibold shadow-md flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        Upload
                      </button>
                    </div>

                    {/* Upload Area */}
                    <div className="border-2 border-dashed border-[#CBD5E1] rounded-lg p-8 text-center hover:border-[#2563EB] hover:bg-[#F8FAFC] transition-all cursor-pointer bg-white">
                      <Upload className="w-12 h-12 text-[#94A3B8] mx-auto mb-3" />
                      <p className="text-sm text-[#64748B] mb-1 font-medium">
                        Drag and drop files here
                      </p>
                      <p className="text-xs text-[#94A3B8]">
                        or click to browse
                      </p>
                    </div>

                    {/* Documents List */}
                    <div className="space-y-2">
                      {mockDocuments.map((doc) => (
                        <div
                          key={doc.id}
                          className="border border-[#E2E8F0] rounded-lg p-3.5 hover:border-[#2563EB] hover:shadow-md transition-all bg-white"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="text-2xl">
                                {getFileIcon(doc.type)}
                              </div>
                              <div>
                                <h5 className="font-semibold text-[#1E293B] text-sm">
                                  {doc.name}
                                </h5>
                                <p className="text-xs text-[#64748B]">
                                  {doc.uploadedBy} • {doc.date} • {doc.size}
                                </p>
                              </div>
                            </div>
                            <button className="p-2 hover:bg-[#F8FAFC] rounded-lg transition-colors border border-[#E2E8F0]">
                              <Download className="w-4 h-4 text-[#64748B]" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Task Notes Tab */}
              {activeTab === 'notes' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-[#1E293B] flex items-center gap-2">
                      <FileText className="w-5 h-5 text-[#2563EB]" />
                      Task Notes
                    </h4>
                    <button
                      onClick={() => setShowNewNoteForm(!showNewNoteForm)}
                      className="px-4 py-2 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-semibold shadow-md"
                    >
                      Add Note
                    </button>
                  </div>

                  {showNewNoteForm && (
                    <div className="bg-gradient-to-br from-[#F8FAFC] to-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm">
                      <input
                        type="text"
                        value={newNote.title}
                        onChange={(e) =>
                          setNewNote({ ...newNote, title: e.target.value })
                        }
                        placeholder="Note title..."
                        className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-[#2563EB] font-semibold shadow-sm"
                      />
                      <textarea
                        value={newNote.content}
                        onChange={(e) =>
                          setNewNote({ ...newNote, content: e.target.value })
                        }
                        placeholder="Note content..."
                        rows={3}
                        className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-[#2563EB] shadow-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleAddNote}
                          className="px-4 py-2 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-semibold shadow-md"
                        >
                          Save Note
                        </button>
                        <button
                          onClick={() => {
                            setShowNewNoteForm(false);
                            setNewNote({ title: '', content: '' });
                          }}
                          className="px-4 py-2 bg-[#F8FAFC] text-[#64748B] rounded-lg hover:bg-[#F1F5F9] transition-colors text-sm font-semibold border border-[#E2E8F0]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {mockTaskNotes.map((note) => (
                      <div
                        key={note.id}
                        className="border border-[#E2E8F0] rounded-lg p-5 hover:shadow-md transition-all bg-white"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h5 className="font-bold text-[#1E293B] text-base">
                            {note.title}
                          </h5>
                          <span
                            className={`text-xs px-2.5 py-1 rounded-lg font-semibold ${getStatusColor(
                              note.status
                            )}`}
                          >
                            {note.status}
                          </span>
                        </div>
                        <p className="text-sm text-[#475569] mb-4 leading-relaxed">
                          {note.content}
                        </p>
                        <div className="flex items-center justify-between text-xs text-[#64748B] pt-3 border-t border-[#E2E8F0]">
                          <span className="font-medium">By {note.author}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {note.date}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline Tab */}
              {activeTab === 'timeline' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-[#1E293B] flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-[#2563EB]" />
                      Project Timeline
                    </h4>
                    <div className="flex items-center gap-2 text-sm text-[#64748B] bg-white rounded-lg px-3 py-2 border border-[#E2E8F0] shadow-sm">
                      <Calendar className="w-4 h-4" />
                      <span className="font-medium">Due: Jan 20, 2026</span>
                    </div>
                  </div>

                  {/* Timeline Header */}
                  <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm">
                    <div className="flex mb-4">
                      <div className="w-48"></div>
                      <div className="flex-1 flex border-l border-[#E2E8F0]">
                        {Array.from({ length: totalDays }, (_, i) => (
                          <div
                            key={i}
                            className="flex-1 text-center text-xs font-semibold text-[#64748B] border-r border-[#E2E8F0] py-2"
                          >
                            Day {i + 1}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Gantt Bars */}
                    <div className="space-y-4">
                      {groupGanttData.map((item, index) => (
                        <div key={index} className="flex items-center">
                          <div className="w-48 pr-4">
                            <p className="text-sm font-bold text-[#1E293B]">
                              {item.task}
                            </p>
                            <p className="text-xs text-[#64748B] font-medium">
                              {item.assignee} • {item.progress}%
                            </p>
                          </div>
                          <div className="flex-1 relative h-10">
                            <div className="absolute inset-0 flex border-l border-[#E2E8F0]">
                              {Array.from({ length: totalDays }, (_, i) => (
                                <div
                                  key={i}
                                  className="flex-1 border-r border-[#E2E8F0]"
                                ></div>
                              ))}
                            </div>
                            <div
                              className="absolute top-1 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-md"
                              style={{
                                left: `${(item.startDay / totalDays) * 100}%`,
                                width: `${(item.duration / totalDays) * 100}%`,
                                backgroundColor: item.color,
                              }}
                            >
                              <div
                                className="h-full bg-black bg-opacity-10 rounded-lg"
                                style={{ width: `${item.progress}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Progress Summary */}
                  <div className="bg-gradient-to-r from-[#DBEAFE] to-[#BFDBFE] border border-[#93C5FD] rounded-lg p-5 shadow-sm">
                    <div className="flex items-center gap-2.5 mb-3">
                      <CheckCircle2 className="w-5 h-5 text-[#2563EB]" />
                      <h5 className="font-bold text-[#1E293B]">
                        Overall Progress
                      </h5>
                    </div>
                    <div className="w-full bg-white rounded-full h-3 mb-2 shadow-sm">
                      <div
                        className="bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] h-3 rounded-full shadow-md"
                        style={{ width: '37%' }}
                      ></div>
                    </div>
                    <p className="text-sm text-[#1E293B] font-semibold">
                      37% complete • 6 days remaining
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
