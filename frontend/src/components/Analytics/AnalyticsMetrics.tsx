import React from 'react';
import Chart from 'react-apexcharts';
import { StatCard } from './StatCard';
import { ApexOptions } from 'apexcharts';

interface Props {
  pulse: number;
  forecastDate: string;
  riskLevel: string;
  bufferDays: number;
  groupId: number;
}

export const AnalyticsMetrics = ({
  pulse,
  forecastDate,
  riskLevel,
  bufferDays,
  groupId
}: Props) => {

  const pulseOptions: ApexOptions = {
    chart: { type: 'radialBar' },
    colors: ['#6366f1'],
    labels: ['Intensity']
  };

  return (
    <>
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900">
            Intelligence Dashboard
          </h2>
          <p className="text-slate-500">
            Predictive AI analysis for Group {groupId}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Completion Forecast" value={forecastDate} detail="AI Predicted Date" type="forecasting"/>
        <StatCard title="Risk Level" value={riskLevel} detail="Random Forest Analysis" type="predictive"/>
        <StatCard title="Milestone Buffer" value={`${bufferDays} Days`} detail="Safety Margin" type="forecasting"/>
      </div>

      <Chart
        options={pulseOptions}
        series={[pulse]}
        type="radialBar"
        height={250}
      />
    </>
  );
};