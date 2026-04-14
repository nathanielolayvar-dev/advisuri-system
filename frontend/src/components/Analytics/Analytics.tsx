import React from 'react';
import { GroupAnalytics } from '../../shared/types';
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
  // Safety check: Handle errors or empty data returned by the backend
  if (!analyticsData || 'error' in analyticsData) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-slate-400">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-3xl shadow-inner mb-4">
          ⚠️
        </div>
        <h2 className="text-xl font-bold text-slate-600 mb-2">
          Analysis Unavailable
        </h2>
        <p className="text-sm max-w-md text-center">
          {String(analyticsData?.error) ||
            'We need more task data to generate an accurate AI predictive model.'}
        </p>
      </div>
    );
  }

  // 1. Map backend response to the GroupAnalytics interface
  // Destructure for cleaner access
  const { metrics, member_report, group_id, history } = analyticsData;

  // 2. ApexCharts Configurations
  // Activity Pulse (Radial Gauge)
  const pulseOptions: ApexOptions = {
    chart: { type: 'radialBar' },
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 135,
        hollow: { size: '70%' },
        track: { background: '#e7e7e7', strokeWidth: '97%' },
        dataLabels: {
          name: { fontSize: '16px', color: '#64748b', offsetY: 120 },
          value: {
            offsetY: 76,
            fontSize: '22px',
            color: '#1e293b',
            formatter: (val) => `${val}%`,
          },
        },
      },
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'dark',
        gradientToColors: ['#818cf8'],
        stops: [0, 100],
      },
    },
    stroke: { lineCap: 'round' },
    labels: ['Team Pulse'],
  };

  //Completion Forecast (Burn-up Chart)
  const forecastOptions: ApexOptions = {
    chart: { type: 'line', toolbar: { show: false } },
    stroke: { curve: 'smooth', width: [4, 2], dashArray: [0, 8] },
    colors: ['#4f46e5', '#94a3b8'],
    xaxis: { categories: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Forecast'] },
    yaxis: { title: { text: 'Tasks' } },
    legend: { position: 'top' },
    markers: { size: 4 },
    // annotation for the vertical forecast line
    annotations: {
      xaxis: [
        {
          x: 'Forecast',
          borderColor: '#ef4444',
          label: {
            text: 'AI Projection',
            style: { color: '#fff', background: '#ef4444' },
          },
        },
      ],
    },
    series: [
      { name: 'Completed Tasks', data: [10, 20, 35, 45, 60] },
      { name: 'Total Tasks', data: [15, 25, 40, 50, 65] },
    ],
  };

  //Contribution Balance (Donut Chart)
  const balanceOptions: ApexOptions = {
    chart: { type: 'donut' },
    labels: analyticsData.member_report.map((m) => m.name),
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
              formatter: () => `${analyticsData.metrics.team_balance_score}%`,
            },
          },
        },
      },
    },
    dataLabels: { enabled: false },
    legend: { position: 'bottom' },
  };

  //Member Bandwidth (Stacked Horizontal Bar)
  const bandwidthOptions: ApexOptions = {
    chart: { type: 'bar', stacked: true, toolbar: { show: false } },
    plotOptions: {
      bar: { horizontal: true, barHeight: '60%', borderRadius: 4 },
    },
    xaxis: { categories: analyticsData.member_report.map((m) => m.name) },
    colors: ['#6366f1', '#e2e8f0'],
    series: [
      {
        name: 'Used Capacity',
        data: analyticsData.member_report.map((m) => m.active_tasks),
      },
      {
        name: 'Remaining',
        data: analyticsData.member_report.map((m) =>
          Math.max(0, 10 - m.active_tasks)
        ),
      },
    ],
    legend: { position: 'top' },
  };

  //Milestone Buffer (Bullet Graph)
  const bufferOptions: ApexOptions = {
    chart: { type: 'bar', height: 100, toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, barHeight: '50%' } },
    colors: [analyticsData.metrics.buffer_days < 0 ? '#ef4444' : '#10b981'],
    xaxis: { categories: ['Days Remaining'], max: 30 }, // Assuming 30-day window
    annotations: {
      xaxis: [{ x: 5, borderColor: '#f59e0b', label: { text: 'Danger Zone' } }],
    },
  };

  //Risk Detection (Risk Matrix Grid)
  const riskOptions: ApexOptions = {
    chart: {
      type: 'heatmap',
      toolbar: { show: false },
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => val.toString(), // Shows the 1-25 score inside the cell
      style: {
        fontSize: '14px',
        fontWeight: 'bold',
      },
    },
    colors: ['#ef4444', '#f59e0b', '#10b981'],
    xaxis: {
      categories: ['Low', 'Medium', 'High'],
      title: { text: 'Likelihood' },
    },
    yaxis: {
      title: { text: 'Impact Score' },
    },
    plotOptions: {
      heatmap: {
        radius: 8,
        enableShades: false,
        colorScale: {
          ranges: [
            { from: 0, to: 5, color: '#10b981', name: 'Low' },
            { from: 6, to: 14, color: '#f59e0b', name: 'Medium' },
            { from: 15, to: 25, color: '#ef4444', name: 'High' },
          ],
        },
      },
    },
  };

  //Task Velocity (Bar + Trend Line)
  const velocityOptions: ApexOptions = {
    chart: { type: 'line', toolbar: { show: false } },
    stroke: { width: [0, 4], curve: 'smooth' },
    colors: ['#e2e8f0', '#6366f1'],
    series: [
      { name: 'Daily Tasks', type: 'column', data: [2, 5, 3, 6, 4] },
      { name: 'Moving Average', type: 'line', data: [3, 3.5, 3.8, 4, 4.2] },
    ],
    xaxis: { categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  };

  //Workload Prediction (Stacked Area Chart)
  const predictionOptions: ApexOptions = {
    chart: { type: 'area', stacked: true, toolbar: { show: false } },
    colors: ['#818cf8', '#c084fc'],
    dataLabels: { enabled: false },
    stroke: { curve: 'monotoneCubic' },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.6, opacityTo: 0.1 } },
    xaxis: { categories: ['Tomorrow', 'Day 2', 'Day 3', 'Day 4', 'Day 5'] },
    series: [
      { name: 'New Incoming Tasks', data: [3, 7, 4, 8, 5] },
      { name: 'Current Backlog', data: [10, 8, 9, 5, 4] },
    ],
  };

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
        <div className="px-4 py-2 bg-indigo-50 rounded-xl border border-indigo-100">
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
            System Status: Optimal
          </span>
        </div>
      </header>

      {/* 2. Top Level Stat Cards (The "Big Three") */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Completion Forecast"
          value={analyticsData.metrics.forecast_end_date}
          detail="AI Predicted Date"
          type="forecasting"
        />
        <StatCard
          title="Risk Level"
          value={analyticsData.metrics.ai_risk_level}
          detail="Random Forest Analysis"
          type="predictive"
        />
        <StatCard
          title="Milestone Buffer"
          value={`${analyticsData.metrics.buffer_days} Days`}
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
            series={forecastOptions.series}
            type="line"
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
                name: 'Risk Level',
                data: [
                  {
                    // The X axis matches the labels: 'Low', 'Medium', or 'High'
                    x: analyticsData.metrics.ai_risk_level,
                    // The Y value triggers the color scale (1-25)
                    y: analyticsData.metrics.risk_score,
                  },
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
            series={[analyticsData.metrics.pulse]}
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
            series={analyticsData.member_report.map((m) => m.active_tasks)}
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
            series={velocityOptions.series}
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
            series={bandwidthOptions.series}
            type="bar"
            height={280}
          />
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 text-center">
            Milestone Buffer
          </h3>
          <Chart
            options={{
              ...bufferOptions,
              series: [
                {
                  name: 'Days Remaining',
                  data: [analyticsData.metrics.buffer_days],
                },
              ],
            }}
            series={[
              {
                name: 'Days Remaining',
                data: [analyticsData.metrics.buffer_days],
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
            series={predictionOptions.series}
            type="area"
            height={280}
          />
        </div>
      </div>
    </div>
  );
};
