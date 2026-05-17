import React, { useState, useEffect } from 'react';
import { Save, Eye, Lock } from 'lucide-react';
import '../../../styles/ScoreSheet.css';
import { supabase } from '../../../supabaseClient';

interface Student {
  id: string;
  username: string;
  full_name?: string;
}

interface Task {
  id: string;
  title: string;
  max_score?: number;
  final_score?: number;
  assigned_to?: string;
}

interface ScoreSheetProps {
  groupId: string;
  students: Student[];
  isStaff: boolean;
  currentUserId: string;
}

export const ScoreSheet: React.FC<ScoreSheetProps> = ({
  groupId,
  students,
  isStaff,
  currentUserId,
}) => {
  const [scores, setScores] = useState<Map<string, Map<string, number>>>(
    new Map()
  );
  const [groupProjectScore, setGroupProjectScore] = useState<number | string>(
    ''
  );
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);

  // Fetch tasks for the group
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const { data: tasksData, error } = await supabase
          .from('tasks')
          .select('id, title, max_score, final_score, assigned_to')
          .eq('group_id', groupId);

        if (error) throw error;
        setTasks((tasksData || []) as Task[]);
      } catch (error) {
        console.error('Error fetching tasks:', error);
      }
    };

    if (groupId) {
      fetchTasks();
    }
  }, [groupId]);

  useEffect(() => {
    console.log('ScoreSheet initialized for user:', currentUserId);
  }, [currentUserId]);

  // Fetch scores for all students and tasks
  useEffect(() => {
    const fetchScores = async () => {
      setLoading(true);
      try {
        if (tasks.length === 0 || students.length === 0) {
          setLoading(false);
          return;
        }

        const scoreMap = new Map<string, Map<string, number>>();
        students.forEach((student) => {
          const sId = String(student.id);
          scoreMap.set(sId, new Map());
          tasks.forEach((task) => {
            scoreMap.get(sId)!.set(String(task.id), 0);
          });
        });

        tasks.forEach((task) => {
          if (task.final_score !== null && task.final_score !== undefined) {
            if (task.assigned_to) {
              const sId = String(task.assigned_to);
              const tId = String(task.id);
              if (scoreMap.has(sId)) {
                scoreMap.get(sId)!.set(tId, task.final_score);
              }
            } else {
              students.forEach((student) => {
                const sId = String(student.id);
                const tId = String(task.id);
                if (scoreMap.has(sId)) {
                  scoreMap.get(sId)!.set(tId, task.final_score!);
                }
              });
            }
          }
        });

        setScores(scoreMap);

        const { data: projectScoresData, error: projectScoreError } =
          await supabase
            .from('project_scores')
            .select('*')
            .eq('group_id', groupId)
            .in(
              'student_id',
              students.map((s) => s.id)
            );

        if (projectScoreError) {
          console.error('Error fetching project scores:', projectScoreError);
        }

        if (projectScoresData && projectScoresData.length > 0) {
          setGroupProjectScore(
            parseFloat(projectScoresData[0].project_score) || 0
          );
        }
      } catch (error) {
        console.error('Error fetching scores:', error);
      } finally {
        setLoading(false);
      }
    };

    if (tasks.length > 0 && students.length > 0) {
      fetchScores();
    }
  }, [groupId, tasks, students]);

  const handleScoreChange = (
    studentId: string,
    taskId: string,
    value: string
  ) => {
    if (!isStaff) return;

    const sId = String(studentId);
    const tId = String(taskId);
    const numValue = Math.max(0, parseFloat(value) || 0);
    const newScores = new Map(scores);

    const task = tasks.find((t) => String(t.id) === tId);

    if (task && !task.assigned_to) {
      students.forEach((student) => {
        const studentStrId = String(student.id);
        if (!newScores.has(studentStrId))
          newScores.set(studentStrId, new Map());
        newScores.get(studentStrId)!.set(tId, numValue);
      });
    } else {
      if (!newScores.has(sId)) {
        newScores.set(sId, new Map());
      }
      newScores.get(sId)!.set(tId, numValue);
    }

    setScores(newScores);
  };

  const getTaskAverage = (taskId: string): number => {
    let total = 0;
    let count = 0;
    const tId = String(taskId);
    students.forEach((student) => {
      const score = scores.get(String(student.id))?.get(tId) || 0;
      if (score > 0) {
        total += score;
        count++;
      }
    });
    return count > 0 ? total / count : 0;
  };

  const handleSave = async () => {
    if (!isStaff) return;

    setSaving(true);
    try {
      const taskUpdates: { id: string; final_score: number }[] = [];

      tasks.forEach((task) => {
        const tId = String(task.id);
        let updatedScore: number | null = null;

        if (task.assigned_to) {
          const sId = String(task.assigned_to);
          if (scores.has(sId)) {
            updatedScore = scores.get(sId)!.get(tId) ?? null;
          }
        } else if (students.length > 0) {
          const sId = String(students[0].id);
          updatedScore = scores.get(sId)!.get(tId) ?? null;
        }

        if (updatedScore !== null) {
          taskUpdates.push({ id: task.id, final_score: updatedScore });
        }
      });

      if (taskUpdates.length > 0) {
        const updatePromises = taskUpdates.map((t) =>
          supabase
            .from('tasks')
            .update({ final_score: t.final_score })
            .eq('id', t.id)
        );
        const results = await Promise.all(updatePromises);
        const errors = results.filter((r) => r.error);
        if (errors.length > 0) {
          throw new Error('Failed to update some task scores');
        }
      }

      const projectScoresArray: any[] = [];
      const finalProjectScore =
        typeof groupProjectScore === 'number'
          ? groupProjectScore
          : parseFloat(groupProjectScore as string) || 0;

      students.forEach((student) => {
        projectScoresArray.push({
          group_id: groupId,
          student_id: student.id,
          project_score: finalProjectScore,
        });
      });

      if (projectScoresArray.length > 0) {
        const { error } = await supabase
          .from('project_scores')
          .upsert(projectScoresArray, { onConflict: 'group_id,student_id' });

        if (error) throw error;
      }

      alert('Scores saved successfully!');
    } catch (error) {
      console.error('Error saving scores:', error);
      alert('Error saving scores. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="score-sheet-wrapper">
        <div className="score-sheet-container flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Loading score sheet...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="score-sheet-wrapper">
      <div className="score-sheet-container">
        {/* Header Block */}
        <div className="score-sheet-header">
          <div>
            <h2>Score Sheet</h2>
            {!isStaff && (
              <div className="flex items-center gap-2 mt-2 text-sm text-white opacity-90">
                <Eye size={14} />
                View Only - Students cannot edit
              </div>
            )}
          </div>
          {isStaff && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="save-button"
            >
              <Save size={18} />
              {saving ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>

        {/* Unified Table Grid Container */}
        <div className="score-sheet-main overflow-auto max-h-[60vh] border border-gray-200 rounded-lg bg-white">
          <table className="w-full border-collapse table-fixed">
            {/* Table Header Axis */}
            <thead className="sticky top-0 z-30 bg-gray-50 shadow-sm">
              <tr>
                {/* Fixed Student Pinned Cell Box */}
                <th className="sticky left-0 top-0 z-40 bg-gray-100 text-left px-4 py-3 border-b border-r border-gray-200 text-xs font-bold text-gray-600 tracking-wider w-56">
                  STUDENTS
                </th>
                {tasks.map((task) => (
                  <th
                    key={task.id}
                    className="px-4 py-3 border-b border-r border-gray-200 text-center min-w-[120px] bg-gray-50"
                  >
                    <div
                      className="text-xs font-semibold text-gray-700 truncate"
                      title={task.title}
                    >
                      {task.title}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      Max: {task.max_score || 100}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Body Rows Grid */}
            <tbody className="divide-y divide-gray-100">
              {students.map((student) => (
                <tr
                  key={student.id}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  {/* Sticky Pinned Student Cell Column */}
                  <td className="sticky left-0 z-10 bg-white px-4 py-3 border-r border-gray-200 font-medium text-sm text-gray-800 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                    <div
                      className="truncate"
                      title={student.full_name || student.username}
                    >
                      {student.full_name || student.username}
                    </div>
                  </td>

                  {/* Dynamic Score Core Cells */}
                  {tasks.map((task) => (
                    <td
                      key={`${student.id}-${task.id}`}
                      className="p-2 border-r border-gray-200 relative text-center"
                    >
                      <div className="relative inline-block w-full">
                        <input
                          type="number"
                          min="0"
                          max={task.max_score || 100}
                          value={
                            scores
                              .get(String(student.id))
                              ?.get(String(task.id)) ?? ''
                          }
                          onChange={(e) =>
                            handleScoreChange(
                              String(student.id),
                              String(task.id),
                              e.target.value
                            )
                          }
                          placeholder="0"
                          className={`w-full text-center py-1 px-2 border border-gray-200 rounded text-sm focus:outline-blue-500 ${
                            !isStaff
                              ? 'bg-gray-50 text-gray-500 cursor-not-allowed'
                              : 'bg-white'
                          }`}
                          disabled={!isStaff}
                        />
                        {!isStaff && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                            <Lock size={11} />
                          </div>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}

              {/* Task Matrix Averages row */}
              {tasks.length > 0 && (
                <tr className="bg-gray-50/70 font-semibold border-t border-gray-300">
                  <td className="sticky left-0 z-10 bg-gray-50 px-4 py-3 border-r border-gray-200 text-xs uppercase text-gray-500 tracking-wider font-bold shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                    Average
                  </td>
                  {tasks.map((task) => (
                    <td
                      key={`avg-${task.id}`}
                      className="px-4 py-3 text-center border-r border-gray-200 text-sm text-gray-700"
                    >
                      {getTaskAverage(task.id).toFixed(1)}
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Summary Card Area */}
        <div className="score-sheet-summary mt-4">
          <div className="summary-grid">
            <div className="summary-card bg-white p-4 border border-gray-200 rounded-lg shadow-sm max-w-xs">
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                  Project Score:
                </label>
                <input
                  type="number"
                  min="0"
                  value={groupProjectScore}
                  onChange={(e) => {
                    if (!isStaff) return;
                    const val = e.target.value;
                    setGroupProjectScore(
                      val === '' ? '' : Math.max(0, parseFloat(val) || 0)
                    );
                  }}
                  placeholder="0"
                  className={`w-full py-1.5 px-3 border border-gray-200 rounded text-sm focus:outline-blue-500 text-center ${
                    !isStaff ? 'bg-gray-50 text-gray-500' : ''
                  }`}
                  disabled={!isStaff}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
