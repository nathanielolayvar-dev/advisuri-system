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
        const response = await fetch(`/api/groups/${groupId}/analytics/`);
        const json = await response.json();
        setData(json);
      } catch (err) {
        console.error('Failed to load analytics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [groupId]);

  if (loading)
    return <div className={styles.loading}>Calculating insights...</div>;
  if (!data)
    return <div className="p-8">No data available for this group.</div>;

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Workspace Intelligence</h2>

      {/* Top Row */}
      <div className={styles.gridThree}>
        <StatCard
          title="Completion Forecast"
          value={data.forecastedCompletion}
          detail={`${data.milestoneBuffer} days buffer`}
          type="forecasting"
        />
        <StatCard
          title="Risk Level"
          value={data.atRiskStatus}
          detail={
            data.atRiskStatus === 'High'
              ? 'Intervention Recommended'
              : 'Project Stable'
          }
          type="predictive"
        />
        <StatCard
          title="Tone Analysis"
          value={data.toneScore}
          detail="Based on recent chat"
          type="predictive"
        />
      </div>

      {/* Middle Row */}
      <div className={styles.gridTwo}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Activity & Velocity</h3>
          <div className="h-48 flex items-end gap-2">
            <p className="text-slate-400 text-sm">
              Activity Pulse: {data.activityPulse}%
            </p>
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Member Workload Prediction</h3>
          {data.memberBandwidth.map((member) => (
            <div key={member.userId} className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span>User {member.userId}</span>
                <span>{member.load}% capacity</span>
              </div>
              <div className={styles.progressBarTrack}>
                <div
                  className={styles.progressBarFill}
                  style={{
                    width: `${member.load}%`,
                    backgroundColor: member.load > 85 ? '#ef4444' : '#3b82f6',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
