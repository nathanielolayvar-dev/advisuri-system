import React from 'react';
import { 
  Activity, 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  Clock, 
  Target,
  Calendar,
  BarChart3,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Zap,
  Brain,
  Shield
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';

// Mock data remains the same
const groupActivityData = [
  { name: 'Team Alpha', messages: 145, notes: 28, logins: 92, status: 'high', color: '#10B981' },
  { name: 'Team Beta', messages: 87, notes: 15, logins: 54, status: 'medium', color: '#F59E0B' },
  { name: 'Team Gamma', messages: 8, notes: 2, logins: 12, status: 'low', color: '#EF4444' },
  { name: 'Team Delta', messages: 112, notes: 22, logins: 78, status: 'high', color: '#10B981' },
  { name: 'Team Epsilon', messages: 3, notes: 0, logins: 5, status: 'ghost', color: '#DC2626' },
];

const taskVelocityData = [
  { group: 'Team Alpha', avgHours: 18, tasksCompleted: 24 },
  { group: 'Team Beta', avgHours: 36, tasksCompleted: 15 },
  { group: 'Team Gamma', avgHours: 72, tasksCompleted: 8 },
  { group: 'Team Delta', avgHours: 24, tasksCompleted: 20 },
  { group: 'Team Epsilon', avgHours: 120, tasksCompleted: 3 },
];

const completionForecastData = [
  { date: 'Week 1', actual: 15, forecast: 15 },
  { date: 'Week 2', actual: 32, forecast: 30 },
  { date: 'Week 3', actual: 48, forecast: 45 },
  { date: 'Week 4', actual: 65, forecast: 62 },
  { date: 'Week 5', actual: null, forecast: 78 },
  { date: 'Week 6', actual: null, forecast: 92 },
  { date: 'Week 7', actual: null, forecast: 100 },
];

const atRiskGroups = [
  { 
    name: 'Team Epsilon', 
    risk: 'Critical',
    riskLevel: 95,
    issues: ['Zero activity for 8 days', '5 overdue tasks', 'No messages in 10 days'],
    color: '#DC2626'
  },
  { 
    name: 'Team Gamma', 
    risk: 'High',
    riskLevel: 72,
    issues: ['Low message frequency', '3 overdue tasks', 'Declining activity trend'],
    color: '#EF4444'
  },
  { 
    name: 'Team Beta', 
    risk: 'Medium',
    riskLevel: 45,
    issues: ['Slow task velocity', '1 overdue task'],
    color: '#F59E0B'
  },
];

const contributionData = [
  {
    group: 'Team Alpha',
    members: [
      { name: 'Alice', tasks: 35, messages: 48, percentage: 35, status: 'balanced' },
      { name: 'Bob', tasks: 32, messages: 42, percentage: 32, status: 'balanced' },
      { name: 'Charlie', tasks: 28, messages: 38, percentage: 28, status: 'balanced' },
      { name: 'Diana', tasks: 5, messages: 12, percentage: 5, status: 'free-rider' },
    ]
  },
  {
    group: 'Team Delta',
    members: [
      { name: 'Eve', tasks: 55, messages: 78, percentage: 55, status: 'burnout' },
      { name: 'Frank', tasks: 22, messages: 28, percentage: 22, status: 'balanced' },
      { name: 'Grace', tasks: 18, messages: 22, percentage: 18, status: 'balanced' },
      { name: 'Henry', tasks: 5, messages: 8, percentage: 5, status: 'free-rider' },
    ]
  }
];

const workloadPredictionData = [
  { group: 'Team Alpha', currentTasks: 8, capacity: 12, canHandle: true },
  { group: 'Team Beta', currentTasks: 11, capacity: 12, canHandle: true },
  { group: 'Team Gamma', currentTasks: 15, capacity: 12, canHandle: false },
  { group: 'Team Delta', currentTasks: 6, capacity: 12, canHandle: true },
  { group: 'Team Epsilon', currentTasks: 18, capacity: 12, canHandle: false },
];

const sentimentData = [
  { week: 'Week 1', positive: 75, neutral: 20, negative: 5 },
  { week: 'Week 2', positive: 68, neutral: 25, negative: 7 },
  { week: 'Week 3', positive: 55, neutral: 30, negative: 15 },
  { week: 'Week 4', positive: 48, neutral: 32, negative: 20 },
];

const milestoneBufferData = [
  { group: 'Team Alpha', forecast: '2026-02-20', deadline: '2026-03-01', buffer: 9, status: 'safe' },
  { group: 'Team Beta', forecast: '2026-02-28', deadline: '2026-03-01', buffer: 1, status: 'tight' },
  { group: 'Team Gamma', forecast: '2026-03-05', deadline: '2026-03-01', buffer: -4, status: 'overdue' },
  { group: 'Team Delta', forecast: '2026-02-18', deadline: '2026-03-01', buffer: 11, status: 'safe' },
  { group: 'Team Epsilon', forecast: '2026-03-15', deadline: '2026-03-01', buffer: -14, status: 'critical' },
];

const memberBandwidthData = [
  { member: 'Alice', groups: 2, tasks: 12, capacity: 15, utilization: 80 },
  { member: 'Bob', groups: 3, tasks: 18, capacity: 15, utilization: 120 },
  { member: 'Charlie', groups: 1, tasks: 8, capacity: 15, utilization: 53 },
  { member: 'Diana', groups: 2, tasks: 4, capacity: 15, utilization: 27 },
  { member: 'Eve', groups: 4, tasks: 22, capacity: 15, utilization: 147 },
];

export default function Analytics() {
  return (
    <div className="p-6 space-y-6 bg-[#F8FAFC]">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#1E293B]">Analytics Dashboard</h2>
          <p className="text-[#64748B] mt-1">Comprehensive insights into group performance and productivity</p>
        </div>
        <div className="text-right bg-white rounded-lg px-4 py-2 border border-[#E2E8F0] shadow-sm">
          <p className="text-sm text-[#64748B] font-medium">Last Updated</p>
          <p className="text-base font-bold text-[#1E293B]">Feb 5, 2026</p>
        </div>
      </div>

      {/* Key Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[
          { label: 'Active Groups', value: '3', icon: Activity, color: 'text-[#2563EB]', bg: 'from-[#DBEAFE] to-[#BFDBFE]' },
          { label: 'At Risk', value: '2', icon: AlertTriangle, color: 'text-[#DC2626]', bg: 'from-[#FEE2E2] to-[#FECACA]' },
          { label: 'Avg Velocity', value: '24h', icon: Zap, color: 'text-[#10B981]', bg: 'from-[#D1FAE5] to-[#A7F3D0]' },
          { label: 'On Schedule', value: '2/5', icon: Target, color: 'text-[#F59E0B]', bg: 'from-[#FEF3C7] to-[#FDE68A]' },
          { label: 'Total Members', value: '23', icon: Users, color: 'text-[#8B5CF6]', bg: 'from-[#E9D5FF] to-[#DDD6FE]' },
        ].map((item, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-[#E2E8F0] p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 bg-gradient-to-br ${item.bg} rounded-lg flex items-center justify-center`}>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <div>
                <p className="text-sm text-[#64748B] font-medium">{item.label}</p>
                <p className={`text-2xl font-bold ${item.label === 'At Risk' ? 'text-[#DC2626]' : 'text-[#1E293B]'}`}>{item.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ENGAGEMENT: Group Activity Pulse */}
      <div className="bg-white rounded-lg shadow-sm border border-[#E2E8F0] p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-gradient-to-br from-[#DBEAFE] to-[#BFDBFE] rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-[#2563EB]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#1E293B]">Group Activity Pulse</h3>
            <p className="text-sm text-[#64748B]">Engagement • Identifies "ghost" groups versus highly active ones</p>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={groupActivityData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 12 }} />
            <YAxis tick={{ fill: '#64748B', fontSize: 12 }} />
            <Tooltip 
              contentStyle={{ backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '8px' }}
            />
            <Legend />
            <Bar dataKey="messages" fill="#3B82F6" name="Messages" radius={[8, 8, 0, 0]} />
            <Bar dataKey="notes" fill="#10B981" name="Note Edits" radius={[8, 8, 0, 0]} />
            <Bar dataKey="logins" fill="#F59E0B" name="Logins" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* RISK MANAGEMENT: At-Risk Detection (REPLACED CircularProgress) */}
      <div className="bg-white rounded-lg shadow-sm border border-[#E2E8F0] p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-gradient-to-br from-[#FEE2E2] to-[#FECACA] rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-[#DC2626]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#1E293B]">At-Risk Detection</h3>
            <p className="text-sm text-[#64748B]">Risk Management • Flags groups likely to fail before deadline</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {atRiskGroups.map((group) => (
            <div 
              key={group.name}
              className="border-2 rounded-lg p-5 hover:shadow-md transition-shadow"
              style={{ borderColor: group.color }}
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-[#1E293B]">{group.name}</h4>
                <span className="px-3 py-1 rounded-lg text-xs font-bold text-white" style={{ backgroundColor: group.color }}>
                  {group.risk}
                </span>
              </div>

              {/* NEW RISK BAR REPLACEMENT */}
              <div className="mb-6">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Risk Level</span>
                  <span className="text-xl font-black" style={{ color: group.color }}>{group.riskLevel}%</span>
                </div>
                <div className="w-full bg-[#F1F5F9] rounded-full h-3">
                  <div 
                    className="h-3 rounded-full transition-all duration-1000"
                    style={{ width: `${group.riskLevel}%`, backgroundColor: group.color }}
                  ></div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-[#64748B] mb-2">Issues Detected:</p>
                {group.issues.map((issue, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-[#475569]">
                    <AlertCircle className="w-3 h-3 mt-0.5" style={{ color: group.color }} />
                    <span>{issue}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Productivity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-lg shadow-sm border border-[#E2E8F0] p-6">
          <h3 className="text-lg font-bold text-[#1E293B] mb-4">Task Velocity</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={taskVelocityData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="group" type="category" width={80} />
              <Tooltip />
              <Bar dataKey="avgHours" fill="#10B981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-[#E2E8F0] p-6">
          <h3 className="text-lg font-bold text-[#1E293B] mb-4">Completion Forecast</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={completionForecastData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="actual" stroke="#3B82F6" fill="#DBEAFE" />
              <Area type="monotone" dataKey="forecast" stroke="#8B5CF6" fill="#E9D5FF" strokeDasharray="5 5" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Additional sections like Tone Analysis and Member Bandwidth would follow the same pattern... */}
    </div>
  );
}