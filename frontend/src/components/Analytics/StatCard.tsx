//Reusable Stat Card (handle the different "Types" of analytics)
import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  detail: string;
  type: 'descriptive' | 'predictive' | 'forecasting';
}

export const StatCard = ({ title, value, detail, type }: StatCardProps) => {
  const colors = {
    forecasting: 'text-emerald-600 bg-emerald-50',
    predictive: 'text-amber-600 bg-amber-50',
    descriptive: 'text-blue-600 bg-blue-50',
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
      <div
        className={`inline-block px-2 py-1 rounded-md text-[10px] font-bold uppercase mb-3 ${colors[type]}`}
      >
        {type}
      </div>
      <h3 className="text-slate-500 text-xs font-medium mb-1">{title}</h3>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-400 mt-2 italic">{detail}</p>
    </div>
  );
};
