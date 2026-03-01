import { Clock, Calendar, CheckCircle2 } from 'lucide-react';

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
  // Calculate overall progress
  const overallProgress = data.length > 0
    ? Math.round(data.reduce((acc, item) => acc + item.progress, 0) / data.length)
    : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                Project Timeline
              </h3>
              <p className="text-xs text-slate-500">Track your group progress</p>
            </div>
          </div>
          
          {/* Progress Badge */}
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-semibold text-slate-700">{overallProgress}% Complete</span>
          </div>
        </div>
      </div>

      <div className="p-6">
        {data.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium">No tasks to display</p>
            <p className="text-slate-400 text-sm mt-1">Create tasks to see your timeline</p>
          </div>
        ) : (
          <>
            {/* Timeline Header */}
            <div className="flex mb-4 bg-slate-50 rounded-lg p-2">
              <div className="w-40 flex-shrink-0"></div>
              <div className="flex-1 flex">
                {Array.from({ length: Math.min(totalDays, 14) }, (_, i) => (
                  <div
                    key={i}
                    className="flex-1 text-center text-xs font-medium text-slate-500 py-1"
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
            </div>

            {/* Gantt Rows */}
            <div className="space-y-3">
              {data.map((item, index) => (
                <div key={index} className="group">
                  <div className="flex items-center mb-2">
                    {/* Task Label */}
                    <div className="w-40 flex-shrink-0 pr-4">
                      <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                        {item.task}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${item.progress}%`,
                              backgroundColor: item.color 
                            }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-500 w-10">
                          {item.progress}%
                        </span>
                      </div>
                    </div>

                    {/* Task Bar Container */}
                    <div className="flex-1 relative h-10">
                      {/* Background Grid */}
                      <div className="absolute inset-0 flex rounded-lg overflow-hidden bg-slate-50">
                        {Array.from({ length: Math.min(totalDays, 14) }, (_, i) => (
                          <div
                            key={i}
                            className="flex-1 border-r border-slate-100"
                          ></div>
                        ))}
                      </div>

                      {/* The Progress Bar */}
                      <div
                        className="absolute top-1 h-8 rounded-lg shadow-sm transition-all duration-500 hover:shadow-md"
                        style={{
                          left: `${Math.max(0, (item.startDay / totalDays) * 100)}%`,
                          width: `${Math.max(4, (item.duration / totalDays) * 100)}%`,
                          backgroundColor: item.color,
                        }}
                      >
                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/10 rounded-lg" />
                        
                        {/* Progress Fill */}
                        <div
                          className="h-full bg-black/10 rounded-lg"
                          style={{ width: `${item.progress}%` }}
                        />
                        
                        {/* Percentage text */}
                        {item.progress > 15 && (
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-sm">
                            {item.progress}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-6 pt-4 border-t border-slate-100">
              <div className="flex flex-wrap gap-3">
                {data.map((item, index) => (
                  <div 
                    key={index} 
                    className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full"
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs font-medium text-slate-600">
                      {item.task}
                    </span>
                    <span className="text-xs text-slate-400">
                      ({item.progress}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
