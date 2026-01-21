import {
  Calendar,
  Clock,
  AlertCircle,
  Bell,
  ArrowUpDown,
  X,
  User,
} from 'lucide-react';
import { useState } from 'react';

// Mock data for due tasks
const dueTasks = [
  {
    id: 1,
    title: 'Submit Research Paper',
    course: 'Computer Science 101',
    dueDate: '2026-01-12',
    priority: 'high',
    status: 'pending',
    description:
      'Complete and submit the research paper on machine learning algorithms. Include abstract, methodology, results, and conclusions.',
  },
  {
    id: 2,
    title: 'Complete Lab Assignment 3',
    course: 'Physics 201',
    dueDate: '2026-01-14',
    priority: 'medium',
    status: 'pending',
    description:
      'Finish all experiments in Lab 3 and submit the lab report with calculations and analysis.',
  },
  {
    id: 3,
    title: 'Group Project Presentation',
    course: 'Business Management',
    dueDate: '2026-01-15',
    priority: 'high',
    status: 'in-progress',
    description:
      'Prepare and deliver a 20-minute presentation on market analysis. Coordinate with team members for slide preparation.',
  },
  {
    id: 4,
    title: 'Quiz 2 Preparation',
    course: 'Mathematics 301',
    dueDate: '2026-01-18',
    priority: 'low',
    status: 'pending',
    description:
      'Review chapters 5-8 and practice problems for the upcoming quiz on calculus and differential equations.',
  },
];

// Mock data for announcements with avatars
const announcements = [
  {
    id: 1,
    title: 'Project Deadline Extended',
    group: 'CS101 - Group A',
    content:
      'The deadline for the research paper has been extended to Jan 15th.',
    time: '2 hours ago',
    isNew: true,
    author: 'Sarah Kim',
    avatar: 'SK',
  },
  {
    id: 2,
    title: 'Meeting Scheduled',
    group: 'Business Management - Team 3',
    content: 'Team meeting scheduled for tomorrow at 3 PM in Room 204.',
    time: '5 hours ago',
    isNew: true,
    author: 'Mike Chen',
    avatar: 'MC',
  },
  {
    id: 3,
    title: 'Resource Materials Shared',
    group: 'Physics 201 - Lab Group B',
    content: 'New reference materials uploaded to the group documents.',
    time: '1 day ago',
    isNew: false,
    author: 'Dr. Johnson',
    avatar: 'DJ',
  },
  {
    id: 4,
    title: 'Exam Schedule Released',
    group: 'Mathematics 301 - Section A',
    content:
      'Mid-term exam will be held on Jan 25th. Check the syllabus for details.',
    time: '2 days ago',
    isNew: false,
    author: 'Prof. Lee',
    avatar: 'PL',
  },
];

// Mock data for gantt chart (project timeline)
const ganttData = [
  {
    task: 'Research & Planning',
    startDay: 0,
    duration: 3,
    progress: 100,
    color: '#3B82F6',
  },
  {
    task: 'Data Collection',
    startDay: 2,
    duration: 4,
    progress: 75,
    color: '#10B981',
  },
  {
    task: 'Analysis',
    startDay: 5,
    duration: 3,
    progress: 30,
    color: '#F59E0B',
  },
  {
    task: 'Report Writing',
    startDay: 7,
    duration: 4,
    progress: 0,
    color: '#8B5CF6',
  },
  {
    task: 'Review & Submission',
    startDay: 10,
    duration: 2,
    progress: 0,
    color: '#EF4444',
  },
];

const totalDays = 12;

type SortOrder = 'high-to-low' | 'low-to-high' | 'date-asc' | 'date-desc';

export default function Dashboard() {
  const [sortOrder, setSortOrder] = useState<SortOrder>('high-to-low');
  const [selectedTask, setSelectedTask] = useState<(typeof dueTasks)[0] | null>(
    null
  );

  const priorityValues = { high: 3, medium: 2, low: 1 };

  const sortedTasks = [...dueTasks].sort((a, b) => {
    if (sortOrder === 'high-to-low') {
      return (
        priorityValues[b.priority as keyof typeof priorityValues] -
        priorityValues[a.priority as keyof typeof priorityValues]
      );
    } else if (sortOrder === 'low-to-high') {
      return (
        priorityValues[a.priority as keyof typeof priorityValues] -
        priorityValues[b.priority as keyof typeof priorityValues]
      );
    } else if (sortOrder === 'date-asc') {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    } else {
      return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
    }
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-[#FEF2F2] text-[#DC2626] border-[#FEE2E2]';
      case 'medium':
        return 'bg-[#FFFBEB] text-[#F59E0B] border-[#FEF3C7]';
      case 'low':
        return 'bg-[#F0FDF4] text-[#10B981] border-[#D1FAE5]';
      default:
        return 'bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0]';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-progress':
        return 'bg-[#DBEAFE] text-[#2563EB]';
      case 'pending':
        return 'bg-[#F1F5F9] text-[#64748B]';
      case 'completed':
        return 'bg-[#D1FAE5] text-[#10B981]';
      default:
        return 'bg-[#F1F5F9] text-[#64748B]';
    }
  };

  const getAvatarColor = (index: number) => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'];
    return colors[index % colors.length];
  };

  return (
    <div className="space-y-5">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] rounded-lg p-6 text-white shadow-lg">
        <h2 className="text-2xl font-bold mb-2">Welcome back, John!</h2>
        <p className="text-blue-100">
          You have {dueTasks.length} pending tasks and{' '}
          {announcements.filter((a) => a.isNew).length} new announcements.
        </p>
      </div>

      {/* Task Details Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full">
            <div className="p-6 border-b border-[#E2E8F0] flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-[#1E293B] mb-2">
                  {selectedTask.title}
                </h3>
                <p className="text-sm text-[#64748B]">{selectedTask.course}</p>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-1.5 hover:bg-[#F8FAFC] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[#64748B]" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-3">
                <span
                  className={`text-xs px-3 py-1.5 rounded-lg border font-medium ${getPriorityColor(
                    selectedTask.priority
                  )}`}
                >
                  {selectedTask.priority} priority
                </span>
                <span
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium ${getStatusColor(
                    selectedTask.status
                  )}`}
                >
                  {selectedTask.status}
                </span>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1E293B] mb-2">
                  Due Date
                </label>
                <div className="flex items-center gap-2 text-[#475569]">
                  <Calendar className="w-4 h-4" />
                  <span>{selectedTask.dueDate}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1E293B] mb-2">
                  Description
                </label>
                <p className="text-[#475569] leading-relaxed">
                  {selectedTask.description}
                </p>
              </div>

              <div className="pt-4 border-t border-[#E2E8F0]">
                <button className="w-full bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white px-4 py-2.5 rounded-lg hover:opacity-90 transition-opacity shadow-md font-medium">
                  Mark as Completed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Due Tasks Section */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-lg shadow-sm border border-[#E2E8F0]">
            <div className="p-5 border-b border-[#E2E8F0]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-gradient-to-br from-[#DBEAFE] to-[#BFDBFE] rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-[#2563EB]" />
                  </div>
                  <h3 className="text-lg font-bold text-[#1E293B]">
                    Due Tasks
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[#64748B] font-medium">
                    {dueTasks.length} tasks
                  </span>
                  <div className="relative">
                    <select
                      value={sortOrder}
                      onChange={(e) =>
                        setSortOrder(e.target.value as SortOrder)
                      }
                      className="text-sm border border-[#E2E8F0] rounded-lg px-3 py-2 pr-9 appearance-none bg-white cursor-pointer hover:border-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2563EB] font-medium text-[#1E293B] shadow-sm"
                    >
                      <option value="high-to-low">Priority: High to Low</option>
                      <option value="low-to-high">Priority: Low to High</option>
                      <option value="date-asc">Due Date: Earliest First</option>
                      <option value="date-desc">Due Date: Latest First</option>
                    </select>
                    <ArrowUpDown className="w-4 h-4 text-[#94A3B8] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-3">
              {sortedTasks.map((task) => (
                <div
                  key={task.id}
                  className="border border-[#E2E8F0] rounded-lg p-4 hover:border-[#2563EB] hover:shadow-md transition-all bg-white"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-[#1E293B] mb-1.5">
                        {task.title}
                      </h4>
                      <p className="text-sm text-[#64748B]">{task.course}</p>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-lg border font-semibold ${getPriorityColor(
                        task.priority
                      )}`}
                    >
                      {task.priority}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-sm text-[#64748B]">
                        <Calendar className="w-4 h-4" />
                        <span className="font-medium">{task.dueDate}</span>
                      </div>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-lg font-semibold ${getStatusColor(
                          task.status
                        )}`}
                      >
                        {task.status}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedTask(task)}
                      className="text-sm text-[#2563EB] hover:text-[#1D4ED8] font-semibold"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gantt Chart Section */}
          <div className="bg-white rounded-lg shadow-sm border border-[#E2E8F0]">
            <div className="p-5 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-gradient-to-br from-[#DBEAFE] to-[#BFDBFE] rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-[#2563EB]" />
                </div>
                <h3 className="text-lg font-bold text-[#1E293B]">
                  Project Timeline - Research Paper
                </h3>
              </div>
            </div>

            <div className="p-5">
              {/* Timeline Header */}
              <div className="flex mb-4">
                <div className="w-48"></div>
                <div className="flex-1 flex border-l border-[#E2E8F0]">
                  {Array.from({ length: totalDays }, (_, i) => (
                    <div
                      key={i}
                      className="flex-1 text-center text-xs font-medium text-[#64748B] border-r border-[#E2E8F0] py-1.5"
                    >
                      Day {i + 1}
                    </div>
                  ))}
                </div>
              </div>

              {/* Gantt Bars */}
              <div className="space-y-3">
                {ganttData.map((item, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-48 pr-4">
                      <p className="text-sm font-semibold text-[#1E293B]">
                        {item.task}
                      </p>
                      <p className="text-xs text-[#64748B] font-medium">
                        {item.progress}% complete
                      </p>
                    </div>
                    <div className="flex-1 relative h-9">
                      <div className="absolute inset-0 flex border-l border-[#E2E8F0]">
                        {Array.from({ length: totalDays }, (_, i) => (
                          <div
                            key={i}
                            className="flex-1 border-r border-[#E2E8F0]"
                          ></div>
                        ))}
                      </div>
                      <div
                        className="absolute top-1 h-7 rounded-lg shadow-md"
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

              {/* Legend */}
              <div className="mt-5 pt-5 border-t border-[#E2E8F0]">
                <p className="text-xs font-semibold text-[#64748B] mb-2.5">
                  Legend:
                </p>
                <div className="flex gap-4 flex-wrap">
                  {ganttData.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="text-xs text-[#64748B] font-medium">
                        {item.task}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Announcements Section */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-[#E2E8F0] sticky top-20">
            <div className="p-5 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-gradient-to-br from-[#DBEAFE] to-[#BFDBFE] rounded-lg flex items-center justify-center">
                  <Bell className="w-5 h-5 text-[#2563EB]" />
                </div>
                <h3 className="text-lg font-bold text-[#1E293B]">
                  Group Announcements
                </h3>
              </div>
            </div>

            <div className="divide-y divide-[#E2E8F0] max-h-[600px] overflow-y-auto">
              {announcements.map((announcement, index) => (
                <div
                  key={announcement.id}
                  className="p-4 hover:bg-[#F8FAFC] transition-colors"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm shadow-sm"
                      style={{ backgroundColor: getAvatarColor(index) }}
                    >
                      {announcement.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="font-semibold text-[#1E293B] text-sm">
                          {announcement.title}
                        </h4>
                        {announcement.isNew && (
                          <span className="bg-[#2563EB] text-white text-xs px-2 py-0.5 rounded-full font-semibold ml-2 flex-shrink-0">
                            New
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#2563EB] font-medium mb-1">
                        {announcement.group}
                      </p>
                      <p className="text-xs text-[#64748B] mb-1.5">
                        by {announcement.author}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-[#475569] mb-2 leading-relaxed">
                    {announcement.content}
                  </p>
                  <p className="text-xs text-[#94A3B8] font-medium">
                    {announcement.time}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
