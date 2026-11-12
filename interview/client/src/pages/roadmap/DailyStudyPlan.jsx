import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, Clock, ListTodo } from 'lucide-react';
import { getActiveRoadmap, getTodayTasks, completeTask, skipTask } from '../../services/roadmapService';
import { StudyTaskCard } from '../../components/roadmap/StudyTaskCard';

export default function DailyStudyPlan() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [roadmap, setRoadmap] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const active = await getActiveRoadmap();
      if (active?.roadmap) {
        setRoadmap(active.roadmap);
        const today = await getTodayTasks(active.roadmap.id || active.roadmap._id);
        setTasks(today || []);
      }
    } catch (err) {
      toast.error("Failed to load today's study plan");
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

  const totalMin = tasks.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);
  const completedMin = tasks
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      <div>
        <Link
          to="/roadmap"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-2 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Roadmap Overview
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Today's Focused Study Plan</h1>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs bg-card p-2.5 rounded-xl border">
            <span className="flex items-center gap-1 font-semibold text-muted-foreground">
              <Clock className="w-3.5 h-3.5" /> {completedMin} / {totalMin} minutes completed
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading today's schedule...
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-card text-card-foreground rounded-2xl border p-12 text-center text-sm shadow-xs">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold">No Pending Tasks Scheduled for Today</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            You have satisfied all scheduled activities for today or your schedule reserves this day for rest.
          </p>
          <Link
            to="/roadmap/calendar"
            className="inline-flex items-center gap-1 mt-4 text-xs font-bold text-primary hover:underline"
          >
            Check Calendar for Upcoming Tasks &rarr;
          </Link>
        </div>
      ) : (
        <div className="space-y-3.5">
          {tasks.map((task) => (
            <StudyTaskCard
              key={task._id || task.id}
              task={task}
              onComplete={handleComplete}
              onSkip={handleSkip}
            />
          ))}
        </div>
      )}
    </div>
  );
}

