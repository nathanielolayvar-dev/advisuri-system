import React, { useState, useEffect, useRef } from 'react';
import { Save, ChevronLeft, ChevronRight, Eye, Lock } from 'lucide-react';
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

interface Score {
  student_id: string;
  task_id: string;
  score: number;
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
  const [scores, setScores] = useState<Map<string, Map<string, number>>>(new Map());
  const [groupProjectScore, setGroupProjectScore] = useState<number | string>('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [scrollLeft, setScrollLeft] = useState(0);
  const tasksContainerRef = useRef<HTMLDivElement>(null);
  const studentsContainerRef = useRef<HTMLDivElement>(null);

  // Fetch tasks for the group
  useEffect(() => {
    const fetchTasks = async () => {
      // This function fetches all tasks for the current group to dynamically create the columns.
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

  // Fetch scores for all students and tasks
  useEffect(() => {
    const fetchScores = async () => {
      // This function fetches all existing scores to populate the grid.
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

        // Use final_score from tasks table directly
        tasks.forEach((task) => {
          if (task.final_score !== null && task.final_score !== undefined) {
            if (task.assigned_to) {
              const sId = String(task.assigned_to);
              const tId = String(task.id);
              if (scoreMap.has(sId)) {
                scoreMap.get(sId)!.set(tId, task.final_score);
              }
            } else {
              // If it's a group task (no assignee), apply the score to everyone in the group
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

        // Fetch project and overall scores
        const { data: projectScoresData, error: projectScoreError } = await supabase
          .from('project_scores')
          .select('*')
          .eq('group_id', groupId)
          .in('student_id', students.map(s => s.id));

        if (projectScoreError) {
          console.error('Error fetching project scores:', projectScoreError);
        }

        if (projectScoresData && projectScoresData.length > 0) {
          setGroupProjectScore(parseFloat(projectScoresData[0].project_score) || 0);
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

  const handleScoreChange = (studentId: string, taskId: string, value: string) => {
    if (!isStaff) return; // Only teachers can edit
    
    const sId = String(studentId);
    const tId = String(taskId);
    const numValue = Math.max(0, parseFloat(value) || 0);
    const newScores = new Map(scores);
    
    const task = tasks.find(t => String(t.id) === tId);
    
    if (task && !task.assigned_to) {
      // Update for all students in the UI simultaneously since it's a group task
      students.forEach(student => {
        const studentStrId = String(student.id);
        if (!newScores.has(studentStrId)) newScores.set(studentStrId, new Map());
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
    if (!isStaff) return; // Only teachers can save
    
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
          taskUpdates.push({
            id: task.id,
            final_score: updatedScore
          });
        }
      });

      if (taskUpdates.length > 0) {
        const updatePromises = taskUpdates.map(t => 
          supabase.from('tasks').update({ final_score: t.final_score }).eq('id', t.id)
        );
        const results = await Promise.all(updatePromises);
        const errors = results.filter(r => r.error);
        if (errors.length > 0) {
          console.error("Task update errors:", errors.map(e => e.error));
          throw new Error("Failed to update some task scores");
        }
      }

      // Save project and overall scores if any
      const projectScoresArray: any[] = [];
      const finalProjectScore = typeof groupProjectScore === 'number' ? groupProjectScore : parseFloat(groupProjectScore as string) || 0;
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

        if (error) {
          console.error("Project score upsert error:", error);
          throw error;
        }
      }

      alert('Scores saved successfully!');
    } catch (error) {
      console.error('Error saving scores:', error);
      alert('Error saving scores. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const container = tasksContainerRef.current;
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        container?.scrollBy({ left: e.deltaY, behavior: 'smooth' });
        setScrollLeft(container?.scrollLeft || 0);
      }
    };

    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }
    return () => container?.removeEventListener('wheel', handleWheel);
  }, []);

  const scrollTasks = (direction: 'left' | 'right') => {
    const container = tasksContainerRef.current;
    if (container) {
      const scrollAmount = 200;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (loading) {
    return (
      <div className="score-sheet-wrapper">
        <div className="score-sheet-container">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">Loading score sheet...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="score-sheet-wrapper">
      <div className="score-sheet-container">
        {/* Header */}
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

        {/* Main Content */}
        <div className="score-sheet-main">
          {/* Students Column */}
          <div className="students-column" ref={studentsContainerRef}>
            <div className="students-header">STUDENTS</div>
            <div className="students-list">
              {students.map((student) => (
                <div key={student.id} className="student-row">
                  <div className="student-name">
                    {student.full_name || student.username}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tasks Grid */}
          <div
            className="tasks-grid-wrapper"
            ref={tasksContainerRef}
          >
            {tasks.length === 0 ? (
              <div className="flex items-center justify-center h-full p-8">
                <div className="text-center text-gray-500">
                  <p className="font-semibold">No tasks yet</p>
                  <p className="text-sm">Create tasks to start grading</p>
                </div>
              </div>
            ) : (
              <div className="tasks-grid">
                {/* Task Headers */}
                <div className="grid-row header-row sticky-header">
                  {tasks.map((task) => (
                    <div key={task.id} className="grid-cell header-cell">
                  <div className="task-title">{task.title}</div>
                      <div className="task-max-score">Max: {task.max_score || 100}</div>
                    </div>
                  ))}
                </div>

                {/* Student Scores */}
                {students.map((student) => (
                  <div key={student.id} className="grid-row">
                    {tasks.map((task) => (
                      <div key={`${student.id}-${task.id}`} className="grid-cell">
                        <input
                          type="number"
                          min="0"
                          max={task.max_score || 100}
                        value={scores.get(String(student.id))?.get(String(task.id)) || ''}
                          onChange={(e) =>
                          handleScoreChange(String(student.id), String(task.id), e.target.value)
                          }
                          placeholder="0"
                          className={`score-input ${!isStaff ? 'read-only' : ''}`}
                          disabled={!isStaff}
                        />
                        {!isStaff && (
                          <div className="read-only-indicator">
                            <Lock size={12} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}

                {/* Average Row */}
                <div className="grid-row average-row">
                  {tasks.map((task) => (
                    <div key={`avg-${task.id}`} className="grid-cell average-cell">
                      <span className="average-value">
                        {getTaskAverage(task.id).toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Scroll Controls */}
          {tasks.length > 5 && (
            <div className="scroll-controls">
              <button onClick={() => scrollTasks('left')} className="scroll-btn">
                <ChevronLeft size={18} />
              </button>
              <button onClick={() => scrollTasks('right')} className="scroll-btn">
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Summary Section */}
        <div className="score-sheet-summary">
          <div className="summary-grid">
            <div className="summary-card">
              <div className="summary-inputs">
                <div className="summary-input-group">
                  <label>Project Score:</label>
                  <input
                    type="number"
                    min="0"
                    value={groupProjectScore}
                    onChange={(e) => {
                      if (!isStaff) return;
                      const val = e.target.value;
                      setGroupProjectScore(val === '' ? '' : Math.max(0, parseFloat(val) || 0));
                    }}
                    placeholder="0"
                    className={`summary-input ${!isStaff ? 'read-only' : ''}`}
                    disabled={!isStaff}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
