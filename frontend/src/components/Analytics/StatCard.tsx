//Reusable Stat Card (handle the different "Types" of analytics)
import React from 'react';
import { TrendingUp, BrainCircuit, CalendarDays } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  detail: string;
  type: 'descriptive' | 'predictive' | 'forecasting';
}

export const StatCard = ({ title, value, detail, type }: StatCardProps) => {
  // Styles mapping for each AI category
  const config = {
    forecasting: {
      style: 'text-emerald-600 bg-emerald-50 border-emerald-100',
      icon: <CalendarDays size={14} />,
      label: 'Timeline Forecast',
    },
    predictive: {
      style: 'text-indigo-600 bg-indigo-50 border-indigo-100',
      icon: <BrainCircuit size={14} />,
      label: 'AI Prediction',
    },
    descriptive: {
      style: 'text-blue-600 bg-blue-50 border-blue-100',
      icon: <TrendingUp size={14} />,
      label: 'Performance',
    },
  };

  const { style, icon, label } = config[type];

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
      <div className="flex justify-between items-start mb-4">
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${style}`}
        >
          {icon}
          {label}
        </div>
      </div>

      <div className="space-y-1">
        <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
          {title}
        </h3>
        <p className="text-2xl font-extrabold text-slate-900 tracking-tight">
          {value || '---'}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-50">
        <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
          {detail}
        </p>
      </div>
    </div>
  );
};
