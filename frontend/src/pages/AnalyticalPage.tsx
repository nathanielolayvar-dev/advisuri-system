import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { analyticsService } from '../services/analyticsService'; // Use the service we built
import { AnalyticsView as AnalyticsDashboard } from '../components/Analytics/Analytics';
import { AnalyticsResponse } from '../shared/types'; // Use the typed interface
import { Loader2, AlertCircle, RefreshCcw, HelpCircle } from 'lucide-react';
import { Sidebar } from '../components/Sidebar/Sidebar';
import { useSidebar } from '../components/Sidebar/SidebarContext';

const AnalyticsPage = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const { isPinned, isHovered } = useSidebar();

  // State Management
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync margin with Sidebar state
  const marginClass = isPinned || isHovered ? 'ml-64' : 'ml-20';

  const loadData = async () => {
    if (!groupId) return;
    try {
      setLoading(true);
      setError(null);

      // Call our typed service
      const result = await analyticsService.getGroupAnalytics(groupId);
      setData(result);
    } catch (err) {
      setError(
        'The intelligence engine is currently unreachable. Please try again.'
      );
    } finally {
      // Small delay to ensure the transition feels smooth
      setTimeout(() => setLoading(false), 500);
    }
  };

  useEffect(() => {
    loadData();
  }, [groupId]);

  // --- 1. LOADING STATE ---
  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#F8F9FB]">
        <Sidebar />
        <div
          className={`flex-1 flex flex-col items-center justify-center transition-all duration-300 ${marginClass}`}
        >
          <div className="text-center animate-in fade-in zoom-in duration-300">
            <Loader2 className="h-14 w-14 animate-spin text-indigo-600 mx-auto mb-6" />
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              Synchronizing AI Insights
            </h3>
            <p className="text-slate-500 text-sm max-w-xs mx-auto">
              Our models are calculating task velocity, member bandwidth, and
              burnout risks...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- 2. ERROR STATE ---
  if (error || !data) {
    return (
      <div className="flex min-h-screen bg-[#F8F9FB]">
        <Sidebar />
        <div
          className={`flex-1 flex flex-col justify-center items-center p-8 transition-all duration-300 ${marginClass}`}
        >
          <div className="max-w-md w-full p-10 text-center bg-white rounded-3xl shadow-sm border border-slate-100">
            <div className="bg-red-50 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="h-10 w-10 text-red-500" />
            </div>
            <h2 className="text-slate-900 font-bold text-2xl mb-3">
              Analysis Halted
            </h2>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
              {error}
            </p>
            <button
              onClick={loadData}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95"
            >
              <RefreshCcw size={18} />
              Re-run AI Analysis
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- 3. SUCCESS STATE ---
  return (
    <div className="flex min-h-screen bg-[#F8F9FB]">
      <Sidebar />

      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-500 ease-in-out ${marginClass}`}
      >
        {/* Modern Sticky Header */}
        <header className="h-20 bg-white/60 backdrop-blur-xl border-b border-slate-200/60 flex items-center justify-between px-10 sticky top-0 z-30">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Intelligence Dashboard
            </h1>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
              Group ID: {data.group_id}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-tighter ${data.metrics.ai_risk_level === 'High' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}
            >
              Risk: {data.metrics.ai_risk_level}
            </div>
          </div>
        </header>

        <main className="p-10 flex-1 overflow-y-auto">
          {/* We pass the full 'data' object to the Dashboard so it doesn't have to fetch again */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <AnalyticsDashboard analyticsData={data} />
          </div>
        </main>
      </div>

      {/* Floating Action Help */}
      <button className="fixed bottom-10 right-10 w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-2xl hover:bg-indigo-600 hover:-translate-y-2 active:scale-90 transition-all z-50 group">
        <HelpCircle
          size={32}
          className="group-hover:rotate-12 transition-transform"
        />
      </button>
    </div>
  );
};

export default AnalyticsPage;
