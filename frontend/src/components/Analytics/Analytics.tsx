import React, { useMemo, useRef, useState, useEffect } from 'react';
import { AnalyticsResponse } from '../../shared/types';
import { StatCard } from './StatCard';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import '../../styles/Analytics.css';

interface AnalyticsViewProps {
  analyticsData: AnalyticsResponse;
}

export const AnalyticsView = ({ analyticsData }: AnalyticsViewProps) => {
  // STATE & HOOKS (Must remain at the top)
  // Tracks if the layout (Tailwind/Sidebar) is stable enough for Charts to render without glitches
  const [isReady, setIsReady] = useState(false);
  // Tracks if the component has entered the React Lifecycle
  const [isMounted, setIsMounted] = useState(false);

  // Chart refs (useful for manual API calls to charts if needed later)
  const forecastChartRef = useRef<any>(null);
  const riskChartRef = useRef<any>(null);
  const pulseChartRef = useRef<any>(null);
  const balanceChartRef = useRef<any>(null);
  const velocityChartRef = useRef<any>(null);
  const bandwidthChartRef = useRef<any>(null);
  const bufferChartRef = useRef<any>(null);
  const predictionChartRef = useRef<any>(null);

  useEffect(() => {
    // Give React 350ms to finish its "Double Invoke" and layout
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 350);

    return () => {
      clearTimeout(timer);
      setIsReady(false); // Kill charts immediately on unmount
    };
  }, []);

  // DATA DESTRUCTURING & FALLBACKS
  const { metrics, member_report, history, group_id } = analyticsData || {};

  const memberNames = useMemo(
    () => member_report?.map((m) => m.name) ?? [],
    [member_report]
  );
  const memberLoads = useMemo(
    () => member_report?.map((m) => m.active_tasks) ?? [],
    [member_report]
  );

  const velocityData = history?.completed_counts ?? [];
  const velocityTrend = history?.velocity_trend ?? [];
  const forecastDates = history?.dates ?? [];
  const predictionDates = history?.prediction_dates ?? [];
  const backlogPrediction = history?.backlog_prediction ?? [];
  const incomingPrediction = history?.incoming_prediction ?? [];
  const totalCounts = history?.total_counts ?? [];

  const pulse = metrics?.pulse ?? 0;
  const bufferDays = metrics?.buffer_days ?? 0;
  const forecastDate = metrics?.forecast_end_date ?? 'N/A';
  const riskLevel = metrics?.ai_risk_level ?? 'Unknown';
  const teamBalanceScore = metrics?.team_balance_score ?? 0;

  const safeVelocity = velocityData.length ? velocityData : [0];
  const safeTotalCounts = totalCounts.length ? totalCounts : [0];
  const safeBacklogPrediction = backlogPrediction.length
    ? backlogPrediction
    : [0];
  const safeIncomingPrediction = incomingPrediction.length
    ? incomingPrediction
    : [0];

  // APEXCHARTS CONFIGURATIONS (Memoized)
  const pulseOptions: ApexOptions = useMemo(
    () => ({
      chart: {
        id: 'advisuri-pulse-chart',
        type: 'radialBar',
        toolbar: { show: false },
      },
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
    }),
    []
  );

  const forecastOptions: ApexOptions = useMemo(
    () => ({
      chart: {
        id: 'advisuri-forecast-chart',
        type: 'area',
        toolbar: { show: false },
      },
      colors: ['#6366f1', '#cbd5e1'],
      stroke: { curve: 'smooth', width: 3 },
      xaxis: { categories: forecastDates },
      annotations: {
        xaxis: [
          {
            x: forecastDate,
            borderColor: '#ef4444',
            label: {
              text: 'AI Goal',
              style: { color: '#fff', background: '#ef4444' },
            },
          },
        ],
      },
    }),
    [forecastDates, forecastDate]
  );

  const balanceOptions: ApexOptions = useMemo(
    () => ({
      chart: { id: 'advisuri-balance-chart', type: 'donut' },
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
                label: 'Balance',
                formatter: () => `${teamBalanceScore}%`,
              },
            },
          },
        },
      },
      dataLabels: { enabled: false },
      legend: { position: 'bottom', labels: { colors: '#64748b' } },
    }),
    [memberNames, teamBalanceScore]
  );

  const bandwidthOptions: ApexOptions = useMemo(
    () => ({
      chart: {
        id: 'advisuri-bandwidth-chart',
        type: 'bar',
        stacked: true,
        toolbar: { show: false },
      },
      plotOptions: { bar: { horizontal: true, borderRadius: 6 } },
      xaxis: { categories: memberNames },
      colors: ['#6366f1', '#f1f5f9'],
    }),
    [memberNames]
  );

  const bufferOptions: ApexOptions = useMemo(
    () => ({
      chart: {
        id: 'advisuri-buffer-chart',
        type: 'bar',
        toolbar: { show: false },
      },
      plotOptions: {
        bar: { horizontal: true, barHeight: '60%', borderRadius: 8 },
      },
      colors: [bufferDays < 3 ? '#ef4444' : '#10b981'],
      xaxis: {
        categories: ['Milestone Buffer'],
        max: 30,
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
    }),
    [bufferDays]
  );

  const riskOptions: ApexOptions = useMemo(
    () => ({
      chart: {
        id: 'advisuri-risk-chart',
        type: 'heatmap',
        toolbar: { show: false },
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: ['Likelihood', 'Impact', 'Urgency'],
        position: 'top',
        labels: { style: { colors: '#64748b' } },
      },
      yaxis: { labels: { style: { colors: '#64748b' } } },
      plotOptions: {
        heatmap: {
          radius: 8,
          enableShades: false,
          colorScale: {
            ranges: [
              { from: 0, to: 2, color: '#10b981', name: 'Low' },
              { from: 2.1, to: 4, color: '#f59e0b', name: 'Med' },
              { from: 4.1, to: 10, color: '#ef4444', name: 'High' },
            ],
          },
        },
      },
    }),
    []
  );

  const velocityOptions: ApexOptions = useMemo(
    () => ({
      chart: {
        id: 'advisuri-velocity-chart',
        type: 'line',
        toolbar: { show: false },
      },
      stroke: { width: [0, 4], curve: 'smooth' },
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
      plotOptions: { bar: { borderRadius: 4, columnWidth: '50%' } },
    }),
    [forecastDates]
  );

  const predictionOptions: ApexOptions = useMemo(
    () => ({
      chart: {
        id: 'advisuri-prediction-chart',
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
      yaxis: { labels: { style: { colors: '#64748b' } } },
      grid: { borderColor: '#f1f5f9' },
    }),
    [predictionDates]
  );

  // GUARD CLAUSE (Ensures DOM and Data are ready)
  if (!analyticsData || !isReady || !isMounted || !metrics) {
    return (
      <div className="flex h-96 items-center justify-center text-slate-500 animate-pulse font-bold uppercase tracking-widest">
        Synchronizing AdviSuri Intelligence...
      </div>
    );
  }

  // RENDER
  return (
    <div className="container p-6 space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            Intelligence Dashboard
          </h2>
          <p className="text-slate-500 font-medium">
            Predictive AI analysis for Group {group_id}
          </p>
        </div>
        <div className="px-4 py-2 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
            System Optimal
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Forecast"
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
          title="Buffer"
          value={`${bufferDays} Days`}
          detail="Safety Margin"
          type="forecasting"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 text-center">
            Completion Forecast (Burn-up)
          </h3>
          {isReady && (
            <Chart
              key={`forecast-${group_id}`} // Dynamic key
              ref={forecastChartRef}
              options={forecastOptions}
              series={[
                { name: 'Completed', data: safeVelocity },
                { name: 'Total Scope', data: safeTotalCounts },
              ]}
              type="area"
              height={320}
            />
          )}
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 text-center">
            AI Risk Matrix
          </h3>
          {isReady && (
            <Chart
              key={`risk-${group_id}`} // Dynamic key
              ref={riskChartRef}
              options={riskOptions}
              series={[
                {
                  name: 'Factors',
                  data: [
                    { x: 'Likelihood', y: metrics?.risk_likelihood ?? 0 },
                    { x: 'Impact', y: metrics?.risk_impact ?? 0 },
                    { x: 'Urgency', y: metrics?.risk_urgency ?? 0 },
                  ],
                },
              ]}
              type="heatmap"
              height={320}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">
            Activity Pulse
          </h3>
          {isReady && (
            <Chart
              key={`pulse-${group_id}`} // Dynamic key
              ref={pulseChartRef}
              options={pulseOptions}
              series={[pulse]}
              type="radialBar"
              height={250}
            />
          )}
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">
            Contribution Balance
          </h3>
          {isReady && (
            <Chart
              key={`balance-${group_id}`} // Dynamic key
              ref={balanceChartRef}
              options={balanceOptions}
              series={memberLoads.length ? memberLoads : []}
              type="donut"
              height={250}
            />
          )}
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
            Task Velocity
          </h3>
          {isReady && (
            <Chart
              key={`velocity-${group_id}`} // Dynamic key
              ref={velocityChartRef}
              options={velocityOptions}
              series={[
                { name: 'Actual', data: safeVelocity },
                { name: 'AI Trend', data: velocityTrend },
              ]}
              type="line"
              height={220}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
            Member Bandwidth
          </h3>
          {isReady && (
            <Chart
              key={`bandwidth-${group_id}`} // Dynamic key
              ref={bandwidthChartRef}
              options={bandwidthOptions}
              series={[
                {
                  name: 'Active',
                  data: memberLoads.length ? memberLoads : [0],
                },
                { name: 'Capacity', data: memberLoads.map((l) => 10 - l) },
              ]}
              type="bar"
              height={280}
            />
          )}
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 text-center">
            Milestone Buffer
          </h3>
          {isReady && (
            <Chart
              key={`buffer-${group_id}`} // Dynamic key
              ref={bufferChartRef}
              options={bufferOptions}
              series={[{ name: 'Days', data: [bufferDays] }]}
              type="bar"
              height={280}
            />
          )}
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
            Upcoming Workload
          </h3>
          {isReady && (
            <Chart
              key={`prediction-${group_id}`} // Dynamic key
              ref={predictionChartRef}
              options={predictionOptions}
              series={[
                { name: 'Backlog', data: safeBacklogPrediction ?? [] },
                { name: 'Predicted', data: safeIncomingPrediction ?? [] },
              ]}
              type="area"
              height={280}
            />
          )}
        </div>
      </div>
    </div>
  );
};
