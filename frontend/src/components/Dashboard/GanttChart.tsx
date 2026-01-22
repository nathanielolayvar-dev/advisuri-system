import { Clock } from 'lucide-react';

interface GanttTask {
  task: string;
  startDay: number;
  duration: number;
  progress: number;
  color: string;
}

interface GanttChartProps {
  data: GanttTask[];
  totalDays: number;
}

export const GanttChart = ({ data, totalDays }: GanttChartProps) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-[#E2E8F0]">
      {/* Header */}
      <div className="p-5 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gradient-to-br from-[#DBEAFE] to-[#BFDBFE] rounded-lg flex items-center justify-center">
            <Clock className="w-5 h-5 text-[#2563EB]" />
          </div>
          <h3 className="text-lg font-bold text-[#1E293B]">
            Project Timeline - Research Paper
          </h3>
        </div>
      </div>

      <div className="p-5">
        {/* Timeline Header (Day labels) */}
        <div className="flex mb-4">
          <div className="w-48"></div>
          <div className="flex-1 flex border-l border-[#E2E8F0]">
            {Array.from({ length: totalDays }, (_, i) => (
              <div
                key={i}
                className="flex-1 text-center text-xs font-medium text-[#64748B] border-r border-[#E2E8F0] py-1.5"
              >
                Day {i + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Gantt Rows */}
        <div className="space-y-3">
          {data.map((item, index) => (
            <div key={index} className="flex items-center">
              {/* Task Label */}
              <div className="w-48 pr-4">
                <p className="text-sm font-semibold text-[#1E293B]">
                  {item.task}
                </p>
                <p className="text-xs text-[#64748B] font-medium">
                  {item.progress}% complete
                </p>
              </div>

              {/* Task Bar Container */}
              <div className="flex-1 relative h-9">
                {/* Background Grid Lines */}
                <div className="absolute inset-0 flex border-l border-[#E2E8F0]">
                  {Array.from({ length: totalDays }, (_, i) => (
                    <div
                      key={i}
                      className="flex-1 border-r border-[#E2E8F0]"
                    ></div>
                  ))}
                </div>

                {/* The Progress Bar */}
                <div
                  className="absolute top-1 h-7 rounded-lg shadow-md transition-all duration-500"
                  style={{
                    left: `${(item.startDay / totalDays) * 100}%`,
                    width: `${(item.duration / totalDays) * 100}%`,
                    backgroundColor: item.color,
                  }}
                >
                  {/* Progress Fill (Darker overlay) */}
                  <div
                    className="h-full bg-black bg-opacity-10 rounded-lg"
                    style={{ width: `${item.progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-5 pt-5 border-t border-[#E2E8F0]">
          <p className="text-xs font-semibold text-[#64748B] mb-2.5">Legend:</p>
          <div className="flex gap-4 flex-wrap">
            {data.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-xs text-[#64748B] font-medium">
                  {item.task}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
