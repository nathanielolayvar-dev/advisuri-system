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
    </div>
  );
};

export default AnalyticsPage;
