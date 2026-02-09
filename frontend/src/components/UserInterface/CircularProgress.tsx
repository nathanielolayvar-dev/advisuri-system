import React from 'react';

interface Props {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
}

const CircularProgress = ({ 
  progress, 
  size = 100, 
  strokeWidth = 8, 
  color = "#3B82F6", 
  label 
}: Props) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90 w-full h-full">
          {/* Background Circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress Circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            style={{ 
                strokeDashoffset: offset,
                transition: 'stroke-dashoffset 0.5s ease' 
            }}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold" style={{ color }}>{progress}%</span>
        </div>
      </div>
      {label && <p className="text-xs font-medium text-gray-500 mt-2">{label}</p>}
    </div>
  );
};

export default CircularProgress;