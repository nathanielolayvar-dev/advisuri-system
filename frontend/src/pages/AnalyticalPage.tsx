//parent component (handles logic)

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { analyticsService } from '../services/analyticsService';
import { getGroups, GroupWithMembers } from '../services/groupService';
import { useGroups } from '../hooks/useGroups';
import { AnalyticsView as AnalyticsDashboard } from '../components/Analytics/Analytics';
import { AnalyticsResponse } from '../shared/types';
import {
  Loader2,
  AlertCircle,
  RefreshCcw,
  HelpCircle,
  ChevronDown,
} from 'lucide-react';
import { Sidebar } from '../components/Sidebar/Sidebar';
import { useSidebar } from '../components/Sidebar/SidebarContext';

const AnalyticsPage = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const { isPinned, isHovered } = useSidebar();

  // State Management
  //Use your new hook here
  const { groups, loading: groupsLoading } = useGroups();

  // Main Analytics State
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Group State
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  console.log('loading:', loading);
  console.log('groupsLoading:', groupsLoading);
  console.log('selectedGroupId:', selectedGroupId);
  console.log('data:', data);

  const marginClass = isPinned || isHovered ? 'ml-64' : 'ml-20';

  useEffect(() => {
    const updateAnalytics = async () => {
      // 1. If we are still waiting for Supabase, just wait.
      if (groupsLoading) return;

      // 2. If Supabase finished but found 0 groups, stop loading and show error.
      if (groups.length === 0) {
        setLoading(false);
        setError('No assigned groups found. Please contact your coordinator.');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const isUrlValid = groups.some((g) => g.id === groupId);

        const targetId = isUrlValid
          ? (groupId as string)
          : selectedGroupId && groups.some((g) => g.id === selectedGroupId)
            ? selectedGroupId
            : groups[0].id;

        setSelectedGroupId(targetId);

        const analyticsResult =
          await analyticsService.getGroupAnalytics(targetId);
        setData(analyticsResult);
      } catch (err) {
        console.error('Analytics Fetch Error:', err);
        setError('The intelligence engine is currently unreachable.');
      } finally {
        setLoading(false);
      }
    };

    updateAnalytics();
  }, [groupId, groups, groupsLoading]);

  const loadData = async () => {
    const effectiveGroupId =
      selectedGroupId || (groups.length > 0 ? groups[0].id : null);

    if (!effectiveGroupId) return;

    try {
      setLoading(true);
      setError(null);
      const result = await analyticsService.getGroupAnalytics(effectiveGroupId);
      console.log('🔥 FINAL DATA:', result);
      setData(result);
    } catch (err) {
      // This catches the 404 or network errors
      setError(
        'The intelligence engine is currently unreachable or the group data was not found.'
      );
      setData(null);
    }
  };

  const handleGroupChange = async (newId: string) => {
    setSelectedGroupId(newId);
    setLoading(true); // Show the overlay/loader
    try {
      const result = await analyticsService.getGroupAnalytics(newId);
      setData(result);
      setError(null);
    } catch (err) {
      setError('Could not load data for this group.');
    } finally {
      setLoading(false);
    }
  };

  // --- 1. LOADING STATE ---
  if (loading || groupsLoading) {
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
              Our models are calculating task velocity and burnout risks...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- 2. ERROR STATE ---
  // Ensure we show error if data is missing OR error state is set
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
              {error || 'Data unavailable'}
            </p>
            <button
              onClick={loadData}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95"
            >
              <RefreshCcw size={18} /> Re-run AI Analysis
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- 3. SUCCESS STATE ---
  // Safe extraction of risk level using Optional Chaining
  const riskLevel = data?.metrics?.ai_risk_level || 'Unknown';

  return (
    <div className="flex min-h-screen bg-[#F8F9FB]">
      <Sidebar />
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-500 ease-in-out ${marginClass}`}
      >
        {/* Show a thin loading bar or overlay instead of replacing the whole page */}
        {loading && (
          <div className="absolute inset-0 z-50 bg-white/50 backdrop-blur-sm flex items-center justify-center">
            <Loader2 className="animate-spin text-indigo-600 h-10 w-10" />
          </div>
        )}

        <header className="h-20 bg-white/60 backdrop-blur-xl border-b border-slate-200/60 flex items-center justify-between px-10 sticky top-0 z-30">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Intelligence Dashboard
              </h1>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                Group ID: {data.group_id}
              </p>
            </div>

            {groups.length > 0 && (
              <div className="relative">
                <select
                  value={selectedGroupId}
                  onChange={(e) => handleGroupChange(e.target.value)}
                  className="appearance-none bg-indigo-50 border border-indigo-200 text-indigo-700 py-2 px-4 pr-10 rounded-xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name} - {group.course}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-500 pointer-events-none" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-tighter ${
                riskLevel === 'High'
                  ? 'bg-red-100 text-red-600'
                  : 'bg-emerald-100 text-emerald-600'
              }`}
            >
              Risk: {riskLevel}
            </div>
          </div>
        </header>

        <main className="p-10 flex-1">
          {/* 1. Check if loading is false
              2. Check if data exists
              3. Use a KEY to force the charts to reset when the ID changes
          */}
          {!loading && data ? (
            <AnalyticsDashboard key={selectedGroupId} analyticsData={data} />
          ) : (
            <div className="flex flex-col items-center justify-center h-64">
              <Loader2 className="animate-spin text-indigo-500 h-10 w-10 mb-4" />
              <p className="text-slate-400 text-sm">
                Loading group insights...
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AnalyticsPage;
