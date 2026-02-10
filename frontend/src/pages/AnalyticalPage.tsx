<<<<<<< Updated upstream
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { NavItem } from '../components/Sidebar/NavItem';
import { 
  Activity, TrendingUp, AlertTriangle, Users, Clock, Target,
  Calendar, BarChart3, MessageSquare, CheckCircle, AlertCircle,
  Zap, Brain, Shield, LayoutDashboard, BookOpen, LogOut, Pin, PinOff, HelpCircle,
  UserCheck, Timer, Gauge
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, Area, AreaChart, PieChart, Pie, Cell 
} from 'recharts';

// --- ALL MOCK DATA CONSTANTS ---
const groupActivityData = [
  { name: 'Team Alpha', messages: 145, notes: 28, logins: 92, status: 'high', color: '#10B981' },
  { name: 'Team Beta', messages: 87, notes: 15, logins: 54, status: 'medium', color: '#F59E0B' },
  { name: 'Team Gamma', messages: 8, notes: 2, logins: 12, status: 'low', color: '#EF4444' },
  { name: 'Team Delta', messages: 112, notes: 22, logins: 78, status: 'high', color: '#10B981' },
  { name: 'Team Epsilon', messages: 3, notes: 0, logins: 5, status: 'ghost', color: '#DC2626' },
];
=======
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getGroupAnalytics } from '../services/analyticsService';
import { AnalyticsView as AnalyticsDashboard } from '../components/Analytics/Analytics';
import { GroupAnalytics } from '../shared/types';
import { Loader2, AlertCircle, RefreshCcw } from 'lucide-react';

const AnalyticsPage = () => {
  // 1. Get groupId from URL and convert to number
  const { groupId } = useParams<{ groupId: string }>();
  const id = Number(groupId);
>>>>>>> Stashed changes

  const [data, setData] = useState<GroupAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const result = await getGroupAnalytics(id.toString());
      setData(result);
    } catch (err) {
      setError(
        "We couldn't reach the intelligence engine. Check your connection."
      );
      console.error('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

<<<<<<< Updated upstream
const atRiskGroups = [
  { name: 'Team Epsilon', risk: 'Critical', riskLevel: 95, issues: ['Zero activity for 8 days', '5 overdue tasks', 'No messages in 10 days'], color: '#DC2626' },
  { name: 'Team Gamma', risk: 'High', riskLevel: 72, issues: ['Low message frequency', '3 overdue tasks', 'Declining activity trend'], color: '#EF4444' },
  { name: 'Team Beta', risk: 'Medium', riskLevel: 45, issues: ['Slow task velocity', '1 overdue task'], color: '#F59E0B' },
];

const memberBandwidthData = [
  { member: 'Alice', groups: 2, tasks: 12, utilization: 80 },
  { member: 'Bob', groups: 3, tasks: 18, utilization: 120 },
  { member: 'Charlie', groups: 1, tasks: 8, utilization: 53 },
  { member: 'Diana', groups: 2, tasks: 4, utilization: 27 },
  { member: 'Eve', groups: 4, tasks: 22, utilization: 147 },
];

const sentimentData = [
  { week: 'Week 1', positive: 75, neutral: 20, negative: 5 },
  { week: 'Week 2', positive: 68, neutral: 25, negative: 7 },
  { week: 'Week 3', positive: 55, neutral: 30, negative: 15 },
  { week: 'Week 4', positive: 48, neutral: 32, negative: 20 },
];

export default function AnalyticsPage() {
  const [isPinned, setIsPinned] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const userRole = localStorage.getItem('user_role') || 'teacher';

  const handleLogout = () => {
    localStorage.removeItem('user_role');
    localStorage.removeItem('token');
    window.location.href = '/logout';
  };

  return (
    <div className="flex min-h-screen bg-[#F8F9FB]">
      {/* 1. SIDEBAR NAVIGATION */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-white border-r border-[#E2E8F0] z-30 transition-all duration-300 ease-in-out flex flex-col shadow-xl group
          ${isPinned ? 'w-64' : 'w-20 hover:w-64'}
        `}
      >
        <div className="p-4 flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-10 px-1">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 bg-[#2563EB] rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-100 flex-shrink-0">
                <Brain size={24} />
              </div>
              <span className={`font-bold text-[#1E293B] text-lg tracking-tight whitespace-nowrap transition-opacity duration-300 ${isPinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                {userRole === 'teacher' ? 'Teacher Portal' : 'Student Portal'}
              </span>
            </div>
            <button onClick={() => setIsPinned(!isPinned)} className={`p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-opacity duration-300 ${isPinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
              {isPinned ? <Pin size={16} className="rotate-45 text-[#2563EB]" /> : <PinOff size={16} />}
            </button>
          </div>

          <nav className="space-y-2">
            <NavItem icon={<LayoutDashboard size={24} />} label="Dashboard" isPinned={isPinned} onClick={() => navigate('/dashboard')} />
            <NavItem icon={<BookOpen size={22} />} label="Analytics" isPinned={isPinned} onClick={() => navigate('/analytics')} />
            <NavItem icon={<Users size={22} />} label="Groups" isPinned={isPinned} onClick={() => navigate('/groups')} />
            <div className="my-2 border-t border-[#E2E8F0] mx-2" />
            <NavItem icon={<LogOut size={24} />} label="Logout" isPinned={isPinned} onClick={handleLogout} className="hover:text-red-600" />
          </nav>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA (OFFSET BY SIDEBAR WIDTH) */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isPinned ? 'ml-64' : 'ml-20'}`}>
        
        {/* Sticky Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-[#E2E8F0] flex items-center justify-between px-10 sticky top-0 z-20">
          <div>
            <h1 className="text-2xl font-extrabold text-[#1E293B] tracking-tight">Analytics</h1>
          </div>
          <div className="hidden md:flex items-center gap-4 bg-gray-50 p-2 rounded-xl border border-gray-100">
             <div className="text-right px-2">
                <p className="text-[10px] text-gray-400 font-bold uppercase">Last Sync</p>
                <p className="text-xs font-black text-gray-700">Feb 10, 2026</p>
             </div>
             <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white animate-pulse">
                <Activity size={16} />
             </div>
          </div>
        </header>

        {/* Main Data View */}
        <main className="p-8 space-y-10 max-w-7xl mx-auto w-full">
          
          {/* Key Metrics Row */}
          <section className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              { label: 'Active Groups', value: '3', icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'At Risk', value: '2', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
              { label: 'Avg Velocity', value: '24h', icon: Zap, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'On Schedule', value: '2/5', icon: Target, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Members', value: '23', icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
            ].map((item, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all">
                <div className={`w-10 h-10 ${item.bg} rounded-xl flex items-center justify-center mb-3`}>
                  <item.icon className={item.color} size={20} />
                </div>
                <p className="text-xs font-bold text-[#64748B] tracking-tight mb-1">{item.label}</p>
                <p className="text-2xl font-black text-[#1E293B]">{item.value}</p>
              </div>
            ))}
          </section>

          {/* Group Activity Pulse (Engagement) */}
          <section className="bg-white p-8 rounded-3xl border border-[#E2E8F0] shadow-sm">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-lg font-black text-[#1E293B] flex items-center gap-2">
                  <Activity className="text-blue-600" size={20} /> Group Activity Pulse
                </h3>
                <p className="text-sm text-[#64748B]">Comparing messages, notes, and login frequency across teams</p>
              </div>
            </div>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={groupActivityData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} />
                  <Tooltip cursor={{fill: '#F8FAFC'}} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} />
                  <Legend iconType="circle" />
                  <Bar dataKey="messages" fill="#3B82F6" radius={[6, 6, 0, 0]} name="Messages" />
                  <Bar dataKey="notes" fill="#10B981" radius={[6, 6, 0, 0]} name="Notes" />
                  <Bar dataKey="logins" fill="#F59E0B" radius={[6, 6, 0, 0]} name="Logins" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Risk Management & Forecast Row */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* At-Risk Cards */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-[#1E293B] uppercase tracking-widest flex items-center gap-2 px-1">
                <AlertTriangle size={18} className="text-red-500" /> Critical Risk Detection
              </h3>
              {atRiskGroups.map((group, idx) => (
                <div key={idx} className="bg-white p-6 rounded-2xl border border-[#E2E8F0] border-l-4 shadow-sm" style={{ borderLeftColor: group.color }}>
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-bold text-[#1E293B]">{group.name}</span>
                    <span className="text-[10px] font-black px-2 py-1 rounded bg-red-50 text-red-600 uppercase tracking-widest">{group.risk} Risk</span>
                  </div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex-1 bg-gray-100 h-2 rounded-full">
                      <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${group.riskLevel}%`, backgroundColor: group.color }} />
                    </div>
                    <span className="text-sm font-black" style={{ color: group.color }}>{group.riskLevel}%</span>
                  </div>
                  <div className="space-y-2">
                    {group.issues.map((issue, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px] text-gray-500 font-medium">
                        <div className="w-1 h-1 rounded-full bg-gray-300" /> {issue}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Velocity & Forecast */}
            <div className="bg-white p-8 rounded-3xl border border-[#E2E8F0] shadow-sm flex flex-col">
              <h3 className="text-sm font-black text-[#1E293B] uppercase tracking-widest mb-6 flex items-center gap-2">
                <TrendingUp size={18} className="text-indigo-500" /> Completion Forecast
              </h3>
              <div className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={completionForecastData}>
                    <defs>
                      <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                    <Tooltip />
                    <Area type="monotone" dataKey="actual" stroke="#6366F1" strokeWidth={3} fillOpacity={1} fill="url(#colorActual)" />
                    <Area type="monotone" dataKey="forecast" stroke="#94A3B8" strokeDasharray="5 5" fill="none" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* Member Bandwidth & Sentiment Row */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             {/* Member Bandwidth */}
             <div className="bg-white p-8 rounded-3xl border border-[#E2E8F0] shadow-sm">
                <h3 className="text-sm font-black text-[#1E293B] uppercase tracking-widest mb-6 flex items-center gap-2">
                  <UserCheck size={18} className="text-emerald-500" /> Member Utilization
                </h3>
                <div className="space-y-6">
                  {memberBandwidthData.map((member, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between text-sm font-bold">
                        <span className="text-gray-700">{member.member}</span>
                        <span className={member.utilization > 100 ? 'text-red-500' : 'text-emerald-500'}>
                          {member.utilization}% Load
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${member.utilization > 100 ? 'bg-red-500' : 'bg-emerald-500'}`} 
                          style={{ width: `${Math.min(member.utilization, 100)}%` }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
             </div>

             {/* Sentiment Over Time */}
             <div className="bg-white p-8 rounded-3xl border border-[#E2E8F0] shadow-sm">
                <h3 className="text-sm font-black text-[#1E293B] uppercase tracking-widest mb-6 flex items-center gap-2">
                  <MessageSquare size={18} className="text-blue-500" /> Sentiment Analysis
                </h3>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sentimentData} stackOffset="expand">
                      <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                      <Tooltip />
                      <Bar dataKey="positive" stackId="a" fill="#10B981" />
                      <Bar dataKey="neutral" stackId="a" fill="#F1F5F9" />
                      <Bar dataKey="negative" stackId="a" fill="#EF4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
             </div>
          </section>

        </main>

        <footer className="p-10 text-center text-xs text-gray-400 font-bold uppercase tracking-widest">
          LMS Analytics Engine • Stable Release 2.4.0
        </footer>
      </div>

      {/* FAB */}
      <button className="fixed bottom-8 right-8 w-14 h-14 bg-[#1E293B] text-white rounded-full flex items-center justify-center shadow-2xl hover:rotate-12 transition-all z-50">
        <HelpCircle size={28} />
      </button>
=======
  useEffect(() => {
    loadData();
  }, [groupId]);

  // Loading State
  if (loading) {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mb-4" />
        <h3 className="text-lg font-semibold text-slate-800">
          Processing Workspace Data
        </h3>
        <p className="text-slate-500 text-sm">
          Our AI is calculating velocity and burnout risks...
        </p>
      </div>
    );
  }

  // Error State
  if (error || !data) {
    return (
      <div className="m-8 p-10 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
        <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-slate-900 font-bold text-xl mb-2">
          Analysis Interrupted
        </h2>
        <p className="text-slate-500 text-sm max-w-xs mx-auto mb-6">{error}</p>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-colors"
        >
          <RefreshCcw size={16} />
          Retry Analysis
        </button>
      </div>
    );
  }

  // Success State
  return (
    <div className="animate-in fade-in duration-500">
      <AnalyticsDashboard groupId={id} />
>>>>>>> Stashed changes
    </div>
  );
};

export default AnalyticsPage;
