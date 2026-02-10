import React, { useState, useEffect } from 'react';
import { GroupAnalytics } from '../../shared/types';
import { StatCard } from './StatCard';
import styles from './AnalyticsView.module.css'; // Import your new styles

export const AnalyticsView = ({ groupId }: { groupId: number }) => {
  const [data, setData] = useState<GroupAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        // Ensure your Django URL matches this path
        const response = await fetch(`/api/groups/${groupId}/analytics/`);
        if (!response.ok) throw new Error('Network response was not ok');

        const json: GroupAnalytics = await response.json();
        setData(json);
      } catch (err) {
        console.error('Failed to load analytics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [groupId]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p className="mt-4 text-slate-500 animate-pulse">
          Running Scikit-Learn Engines...
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center">
        No intelligence data found for this workspace.
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className="mb-8">
        <h2 className={styles.title}>Workspace Intelligence</h2>
        <p className="text-slate-500 text-sm">
          Predictive insights based on task patterns and team activity.
        </p>
      </header>

      {/* Row 1: The "Big Three" ML Insights */}
      <div className={styles.gridThree}>
        <StatCard
          title="Completion Forecast"
          value={data.completion_forecast}
          detail={`${data.milestone_buffer} days buffer remaining`}
          type="forecasting"
        />
        <StatCard
          title="Health Risk Level"
          value={data.at_risk_status}
          detail={
            data.at_risk_status === 'High'
              ? 'Requires Intervention'
              : 'Healthy Progress'
          }
          type="predictive"
        />
        <StatCard
          title="Task Sentiment"
          value={data.tone_analysis}
          detail="Calculated from task language"
          type="predictive"
        />
      </div>

      {/* Row 2: Performance & Load */}
      <div className={styles.gridTwo}>
        {/* Descriptive Metrics Card */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Performance Pulse</h3>
          <div className="space-y-6 mt-4">
            <div className="flex justify-between items-end">
              <span className="text-slate-500 text-sm font-medium">
                Task Velocity
              </span>
              <span className="text-2xl font-bold text-slate-800">
                {data.task_velocity}{' '}
                <small className="text-xs text-slate-400">tasks/day</small>
              </span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-slate-500 text-sm font-medium">
                Activity Pulse
              </span>
              <span className="text-2xl font-bold text-indigo-600">
                {data.activity_pulse}%
              </span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-slate-500 text-sm font-medium">
                Contribution Balance
              </span>
              <span className="text-2xl font-bold text-slate-800">
                {data.contribution_balance}%
              </span>
            </div>
          </div>
        </div>

        {/* Predictive Bandwidth Card */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Member Bandwidth (ML Predicted)</h3>
          <div className="mt-4 space-y-5">
            {data.member_bandwidth.map((member, index) => (
              <div key={index}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700">
                    {member.name}
                  </span>
                  <span
                    className={
                      member.risk_score > 80
                        ? 'text-red-500 font-bold'
                        : 'text-slate-500'
                    }
                  >
                    {Math.round(member.risk_score)}% Load
                  </span>
                </div>
                <div className={styles.progressBarTrack}>
                  <div
                    className={styles.progressBarFill}
                    style={{
                      width: `${member.risk_score}%`,
                      backgroundColor:
                        member.risk_score > 80
                          ? '#ef4444'
                          : member.risk_score > 50
                            ? '#f59e0b'
                            : '#3b82f6',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
