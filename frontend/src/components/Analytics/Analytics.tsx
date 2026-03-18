//presentation component (handles UI)

import React, { useMemo } from 'react';
import { AnalyticsResponse } from '../../shared/types';
import { StatCard } from './StatCard';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import '../../styles/Analytics.css'; // Import styles

interface AnalyticsViewProps {
  /**
   * Analytics metrics from the API response
   * Contains: pulse, velocity, forecast_end_date, ai_risk_level, team_balance_score, buffer_days
   */
  analyticsData: AnalyticsResponse;
}

export const AnalyticsView = ({ analyticsData }: AnalyticsViewProps) => {
  // Prevent crash if API data hasn't loaded yet
  if (!analyticsData) {
    return <div className="p-6 text-slate-500">Loading analytics...</div>;
  }
  
  // 1. Map backend response to the GroupAnalytics interface
  // Destructure for cleaner access
  const { metrics, member_report, group_id, history } = analyticsData;

  // Precompute frequently used arrays
  // Member analytics
  const memberNames = member_report?.map((m) => m.name) ?? [];
  const memberLoads = member_report?.map((m) => m.active_tasks) ?? [];

  // Historical analytics
  const velocityData = history?.completed_counts ?? [];
  const velocityTrend = history?.velocity_trend ?? [];
  const forecastDates = history?.dates ?? [];
  const predictionDates = history?.prediction_dates ?? [];
  const backlogPrediction = history?.backlog_prediction ?? [];
  const incomingPrediction = history?.incoming_prediction ?? [];
  const totalCounts = history?.total_counts ?? [];

  const pulse = metrics?.pulse ?? 0;
  const bufferDays = metrics?.buffer_days ?? 0;
  const forecastDate = metrics?.forecast_end_date ?? "N/A";
  const riskLevel = metrics?.ai_risk_level ?? "Unknown";
  const teamBalanceScore = metrics?.team_balance_score ?? 0;

  //Fallback
  const safeVelocity = velocityData.length ? velocityData : [0];
  const safeTotalCounts = totalCounts.length ? totalCounts : [0];
  const safeBacklogPrediction = backlogPrediction.length ? backlogPrediction : [0];
  const safeIncomingPrediction = incomingPrediction.length ? incomingPrediction : [0];

  // 2. ApexCharts Configurations
  // Activity Pulse (Radial Gauge)
  const pulseOptions: ApexOptions = {
    chart: { type: 'radialBar' },
    colors: ['#6366f1'],
    labels: ['Intensity'],
    plotOptions: {
      radialBar: {
        hollow: { size: '70%' },
        dataLabels: {
          value: {
            fontSize: '22px',
            fontWeight: 'bold',
            formatter: (val) => `${val}%`,
          },
        },
      },
    },
  };

  //Completion Forecast (Burn-up Chart)
  const forecastOptions: ApexOptions = useMemo(() => ({
    chart: { type: 'area', toolbar: { show: false } },
    colors: ['#6366f1', '#cbd5e1'],
    stroke: { curve: 'smooth', width: 3 },
    xaxis: { categories: forecastDates },
    annotations: {
      xaxis: [
        {
          x: metrics?.forecast_end_date,
          borderColor: '#ef4444',
          label: {
            text: 'AI Goal',
            style: { color: '#fff', background: '#ef4444' },
          },
        },
      ],
    },
  }), [forecastDates, metrics?.forecast_end_date]);

  //Contribution Balance (Donut Chart)
  const balanceOptions: ApexOptions = useMemo(() => ({
    chart: { type: 'donut' },
    labels: memberNames,
    colors: ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b'],
    plotOptions: {
      pie: {
        donut: {
          size: '75%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Balance Score',
              formatter: () => `${teamBalanceScore}%`,
            },
          },
        },
      },
    },
    dataLabels: { enabled: false },
    legend: {
      position: 'bottom',
      labels: { colors: '#64748b' },
    },
  }), [memberNames, teamBalanceScore]);

  //Member Bandwidth (Stacked Horizontal Bar)
  const bandwidthOptions: ApexOptions = useMemo(() => ({
    chart: { type: 'bar', stacked: true, toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 6 } },
    xaxis: { categories: memberNames },
    colors: ['#6366f1', '#f1f5f9'],
  }), [memberNames]);

  //Milestone Buffer (Bullet Graph)
  const bufferOptions: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '60%',
        borderRadius: 8,
      },
    },
    // REAL-TIME COLOR: Switches color based on the actual value in the database
    colors: [bufferDays < 3 ? '#ef4444' : '#10b981'],
    xaxis: {
      categories: ['Milestone Buffer'],
      max: 30, // Can also make this dynamic: analyticsData.metrics.total_days_in_sprint
      labels: { style: { colors: '#64748b' } },
    },
    grid: { show: false },
    annotations: {
      xaxis: [
        {
          x: 5,
          borderColor: '#f59e0b',
          strokeDashArray: 4,
          label: {
            text: 'Danger Zone',
            style: { color: '#fff', background: '#f59e0b' },
          },
        },
      ],
    },
  };

  //Risk Detection (Risk Matrix Grid)
  const riskOptions: ApexOptions = {
    chart: {
      type: 'heatmap',
      toolbar: { show: false },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: ['Likelihood', 'Impact', 'Urgency'], // The dimensions of your AI risk analysis
      position: 'top',
      labels: { style: { colors: '#64748b' } },
    },
    yaxis: {
      labels: { style: { colors: '#64748b' } },
    },
    plotOptions: {
      heatmap: {
        radius: 8,
        enableShades: false,
        colorScale: {
          ranges: [
            { from: 0, to: 2, color: '#10b981', name: 'Low' }, // Green
            { from: 2.1, to: 4, color: '#f59e0b', name: 'Med' }, // Orange
            { from: 4.1, to: 10, color: '#ef4444', name: 'High' }, // Red
          ],
        },
      },
    },
  };

  //Task Velocity (Bar + Trend Line)
  const velocityOptions: ApexOptions = useMemo(() => ({
    chart: {
      type: 'line',
      toolbar: { show: false },
      stacked: false,
    },
    stroke: {
      width: [0, 4],
      curve: 'smooth',
    },
    colors: ['#e2e8f0', '#6366f1'],
    xaxis: {
      categories: forecastDates,
      labels: { style: { colors: '#64748b' } },
    },
    yaxis: {
      title: { text: 'Tasks Finished' },
      labels: { style: { colors: '#64748b' } },
    },
    legend: { position: 'top' },
    plotOptions: {
      bar: { borderRadius: 4, columnWidth: '50%' },
    },
  }), [forecastDates]);

  //Workload Prediction (Stacked Area Chart)
  const predictionOptions: ApexOptions = useMemo(() => ({
    chart: {
      type: 'area',
      stacked: true,
      toolbar: { show: false },
    },
    colors: ['#818cf8', '#c084fc'],
    dataLabels: { enabled: false },
    stroke: { curve: 'monotoneCubic', width: 2 },
    fill: {
      type: 'gradient',
      gradient: { opacityFrom: 0.6, opacityTo: 0.1 },
    },
    xaxis: {
      categories: predictionDates,
      labels: { style: { colors: '#64748b' } },
    },
    yaxis: {
      labels: { style: { colors: '#64748b' } },
    },
    tooltip: { x: { format: 'dd MMM' } },
    grid: { borderColor: '#f1f5f9' },
  }), [predictionDates]);

  //put other charts options here for other algorithms...

  return (
    <div className="container p-6 space-y-8">
      {/* 1. Header Section */}
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            Intelligence Dashboard
          </h2>
          <p className="text-slate-500 font-medium">
            Predictive AI analysis for Group {analyticsData.group_id}
          </p>
        </div>
        <div className="px-4 py-2 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
            System Status: Optimal
          </span>
        </div>
      </header>

      {/* 2. Top Level Stat Cards (The "Big Three") */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Completion Forecast"
          value={forecastDate}
          detail="AI Predicted Date"
          type="forecasting"
        />
        <StatCard
          title="Risk Level"
          value={riskLevel}
          detail="Random Forest Analysis"
          type="predictive"
        />
        <StatCard
          title="Milestone Buffer"
          value={`${bufferDays} Days`}
          detail="Safety Margin"
          type="forecasting"
        />
      </div>

      {/* 3. Primary Analysis Row (Forecast & Risk Matrix) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 text-center">
            Completion Forecast (Burn-up)
          </h3>
          <Chart
            options={forecastOptions}
            series={[
              {
                name: 'Completed Tasks',
                data: safeVelocity,
              },
              {
                name: 'Total Scope',
                data: safeTotalCounts,
              },
            ]}
            type="area"
            height={320}
          />
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 text-center">
            AI Risk Matrix
          </h3>
          <Chart
            options={riskOptions}
            series={[
              {
                name: 'Risk Factors',
                data: [
                  {
                    x: 'Likelihood',
                    y: metrics?.risk_likelihood ?? 0,
                  },
                  { x: 'Impact', y: metrics?.risk_impact ?? 0 },
                  { x: 'Urgency', y: metrics?.risk_urgency ?? 0 },
                ],
              },
            ]}
            type="heatmap"
            height={320}
          />
        </div>
      </div>

      {/* 4. Team Dynamics Row (Pulse, Balance, Velocity) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">
            Activity Pulse
          </h3>
          <Chart
            options={pulseOptions}
            series={[pulse]}
            type="radialBar"
            height={250}
          />
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">
            Contribution Balance
          </h3>
          <Chart
            options={balanceOptions}
            series={memberLoads.length ? memberLoads : [0]}
            type="donut"
            height={250}
          />
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
            Task Velocity
          </h3>
          <Chart
            options={velocityOptions}
            series={[
              {
                name: 'Actual Output',
                type: 'column',
                data: safeVelocity,
              },
              {
                name: 'AI Velocity Trend',
                type: 'line',
                data: velocityTrend,
              },
            ]}
            type="line"
            height={220}
          />
        </div>
      </div>

      {/* 5. Resource & Future Load Row (Bandwidth, Buffer & Workload) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
            Member Bandwidth
          </h3>
          <Chart
            options={bandwidthOptions}
            series={[
              {
                name: 'Active Tasks',
                data: memberLoads.length ? memberLoads : [0],
              },
              {
                name: 'Capacity',
                data: memberLoads.length ? memberLoads.map((load) => Math.max(0, 10 - load)) : [0],
              },
            ]}
            type="bar"
            height={280}
          />
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 text-center">
            Milestone Buffer
          </h3>
          <Chart
            options={bufferOptions}
            series={[
              {
                name: 'Days Remaining',
                data: [bufferDays],
              },
            ]}
            type="bar"
            height={280}
          />
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
            Upcoming Workload (7-Day Prediction)
          </h3>
          <Chart
            options={predictionOptions}
            series={[
              {
                name: 'Current Backlog',
                data: safeBacklogPrediction,
              },
              {
                name: 'New Predicted Tasks',
                data: safeIncomingPrediction,
              },
            ]}
            type="area"
            height={280}
          />
        </div>
      </div>
    </div>
  );
};
