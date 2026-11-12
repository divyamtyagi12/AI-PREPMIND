import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Calendar, CheckCircle2, Clock } from 'lucide-react';
import { getActiveRoadmap, getWeekTasks, completeTask, skipTask } from '../../services/roadmapService';
import { StudyTaskCard } from '../../components/roadmap/StudyTaskCard';

export default function WeeklyStudyPlan() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [roadmap, setRoadmap] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const active = await getActiveRoadmap();
      if (active?.roadmap) {
        setRoadmap(active.roadmap);
        const week = await getWeekTasks(active.roadmap.id || active.roadmap._id);
        setTasks(week || []);
      }
    } catch (err) {
      toast.error('Failed to load weekly study plan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleComplete = async (taskId) => {
    try {
      await completeTask(taskId);
      toast.success('Task completed!');
      loadData();
    } catch (err) {
      toast.error('Failed to update task');
    }
  };

  const handleSkip = async (taskId) => {
    try {
      await skipTask(taskId);
      toast.info('Task skipped');
      loadData();
    } catch (err) {
      toast.error('Failed to update task');
    }
  };

  // Group by date string
  const groupedByDate = new Map();
  for (const t of tasks) {
    const dStr = new Date(t.scheduledDate).toISOString().split('T')[0];
    if (!groupedByDate.has(dStr)) groupedByDate.set(dStr, []);
    groupedByDate.get(dStr).push(t);
  }

  const sortedDates = Array.from(groupedByDate.keys()).sort();

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      <div>
        <Link
          to="/roadmap"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-2 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Roadmap Overview
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Weekly Learning Plan (Next 7 Days)</h1>
        <p className="text-xs text-muted-foreground">
          Structured roadmap tasks scheduled over the upcoming week.
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading weekly plan...
        </div>
      ) : sortedDates.length === 0 ? (
        <div className="bg-card text-card-foreground rounded-2xl border p-12 text-center text-sm shadow-xs">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold">No Tasks Scheduled in the Next 7 Days</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            All curriculum items for this week are completed or scheduled further out.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((dateStr) => {
            const dayTasks = groupedByDate.get(dateStr) || [];
            const dateObj = new Date(dateStr);

            return (
              <div key={dateStr} className="space-y-3">
                <div className="flex items-center gap-2 border-b pb-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <h3 className="font-bold text-sm text-foreground">
                    {dateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                  </h3>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {dayTasks.length} task{dayTasks.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="space-y-3">
                  {dayTasks.map((task) => (
                    <StudyTaskCard
                      key={task._id || task.id}
                      task={task}
                      onComplete={handleComplete}
                      onSkip={handleSkip}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

