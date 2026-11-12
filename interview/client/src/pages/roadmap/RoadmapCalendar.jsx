import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { getActiveRoadmap, getRoadmapTasks, completeTask, skipTask, rescheduleTask } from '../../services/roadmapService';
import { StudyCalendar } from '../../components/roadmap/StudyCalendar';

export default function RoadmapCalendar() {
  const [loading, setLoading] = useState(true);
  const [roadmap, setRoadmap] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');

  const loadData = async () => {
    try {
      setLoading(true);
      const active = await getActiveRoadmap();
      if (active?.roadmap) {
        setRoadmap(active.roadmap);
        const taskData = await getRoadmapTasks(active.roadmap.id || active.roadmap._id, {
          status: filterStatus === 'all' ? undefined : filterStatus,
          limit: 300,
        });
        setTasks(taskData.tasks || []);
      }
    } catch (err) {
      toast.error('Failed to load study calendar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  const handleComplete = async (taskId) => {
    try {
      await completeTask(taskId);
      toast.success('Task marked as completed!');
      loadData();
    } catch (err) {
      toast.error('Failed to complete task');
    }
  };

  const handleSkip = async (taskId) => {
    try {
      await skipTask(taskId);
      toast.info('Task marked as skipped');
      loadData();
    } catch (err) {
      toast.error('Failed to skip task');
    }
  };

  const handleReschedule = async (taskId, newDate) => {
    try {
      await rescheduleTask(taskId, newDate);
      toast.success('Task rescheduled');
      loadData();
    } catch (err) {
      toast.error('Failed to reschedule task');
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/roadmap"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-2 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Roadmap Overview
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Study Schedule Calendar</h1>
          <p className="text-xs text-muted-foreground">
            Day-by-day distribution of concept study, adaptive practice, and spaced reviews.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-card border rounded-lg px-3 py-1.5 text-xs font-semibold"
          >
            <option value="all">All Tasks</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="skipped">Skipped</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-sm text-muted-foreground">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading calendar...
        </div>
      ) : (
        <StudyCalendar
          tasks={tasks}
          onComplete={handleComplete}
          onSkip={handleSkip}
          onReschedule={handleReschedule}
        />
      )}
    </div>
  );
}

