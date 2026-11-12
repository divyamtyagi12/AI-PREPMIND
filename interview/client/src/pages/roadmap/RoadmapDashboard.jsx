import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Calendar,
  CheckCircle2,
  Compass,
  ListTodo,
  Play,
  PlusCircle,
  RefreshCw,
  Settings,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  getActiveRoadmap,
  completeTask,
  skipTask,
  replanRoadmap,
  getDueRevisions,
  getRoadmapAnalytics,
} from '../../services/roadmapService';
import { RoadmapProgressCard } from '../../components/roadmap/RoadmapProgressCard';
import { StudyTaskCard } from '../../components/roadmap/StudyTaskCard';
import { RevisionReminderCard } from '../../components/roadmap/RevisionReminderCard';
import { WeeklyProgressChart } from '../../components/roadmap/WeeklyProgressChart';
import { MilestoneCard } from '../../components/roadmap/MilestoneCard';

export default function RoadmapDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [dueRevisions, setDueRevisions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [replanning, setReplanning] = useState(false);

  const fetchActive = async () => {
    try {
      setLoading(true);
      const res = await getActiveRoadmap();
      setData(res);

      if (res?.roadmap) {
        const [revs, anal] = await Promise.all([
          getDueRevisions(res.roadmap.id || res.roadmap._id),
          getRoadmapAnalytics(res.roadmap.id || res.roadmap._id),
        ]);
        setDueRevisions(revs || []);
        setAnalytics(anal);
      }
    } catch (err) {
      toast.error('Failed to load active roadmap');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActive();
  }, []);

  const handleCompleteTask = async (taskId) => {
    try {
      await completeTask(taskId);
      toast.success('Task marked as completed!');
      fetchActive();
    } catch (err) {
      toast.error('Failed to complete task');
    }
  };

  const handleSkipTask = async (taskId) => {
    try {
      await skipTask(taskId);
      toast.info('Task skipped');
      fetchActive();
    } catch (err) {
      toast.error('Failed to skip task');
    }
  };

  const handleManualReplan = async () => {
    if (!data?.roadmap) return;
    setReplanning(true);
    try {
      await replanRoadmap(data.roadmap.id || data.roadmap._id, {
        reason: 'Student manual sync request',
        force: true,
      });
      toast.success('Roadmap replanned and synchronized with latest progress!');
      fetchActive();
    } catch (err) {
      toast.error('Failed to replan roadmap');
    } finally {
      setReplanning(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-12 px-4 text-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-muted-foreground font-semibold">Loading your placement roadmap...</p>
      </div>
    );
  }

  if (!data?.roadmap) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4 font-bold">
          <Compass className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">No Active Placement Roadmap</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6 leading-relaxed">
          You haven't generated a personalized learning roadmap yet. Build one based on your target role, timeline, and daily study availability.
        </p>
        <Link
          to="/roadmap/setup"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm"
        >
          <PlusCircle className="w-4 h-4" /> Setup My Learning Roadmap
        </Link>
      </div>
    );
  }

  const { roadmap, todayTasks = [], milestones = [], pendingCount = 0 } = data;

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Personalized Learning Roadmap</h1>
          <p className="text-xs text-muted-foreground">
            Adaptive daily study tasks, spaced revisions, and milestone achievements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleManualReplan}
            disabled={replanning}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border hover:bg-secondary transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${replanning ? 'animate-spin' : ''}`} />
            {replanning ? 'Syncing...' : 'Sync & Replan'}
          </button>
          <Link
            to="/roadmap/calendar"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border hover:bg-secondary transition"
          >
            <Calendar className="w-3.5 h-3.5" /> Full Calendar
          </Link>
          <Link
            to="/roadmap/settings"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border hover:bg-secondary transition"
          >
            <Settings className="w-3.5 h-3.5" /> Settings
          </Link>
        </div>
      </div>

      {/* Progress Card */}
      <RoadmapProgressCard
        roadmap={roadmap}
        todayTasksCount={todayTasks.length}
        pendingCount={pendingCount}
      />

      {/* Spaced Revision Reminder Alert */}
      {dueRevisions.length > 0 && <RevisionReminderCard dueRevisions={dueRevisions} />}

      {/* Main Content Grid: Today's Tasks & Weekly Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Today's Tasks */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold">Today's Study Plan</h3>
            </div>
            <Link
              to="/roadmap/daily"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Focused View &rarr;
            </Link>
          </div>

          {todayTasks.length === 0 ? (
            <div className="bg-card text-card-foreground rounded-2xl border p-8 text-center text-sm text-muted-foreground shadow-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-foreground">You are all caught up for today!</p>
              <p className="text-xs mt-1">Review upcoming days or take an adaptive practice session.</p>
              <Link
                to="/adaptive"
                className="inline-flex items-center gap-1 mt-4 text-xs font-bold text-primary hover:underline"
              >
                Go to Adaptive Practice &rarr;
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {todayTasks.map((task) => (
                <StudyTaskCard
                  key={task._id || task.id}
                  task={task}
                  onComplete={handleCompleteTask}
                  onSkip={handleSkipTask}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Weekly Progress & Milestones */}
        <div className="lg:col-span-5 space-y-6">
          <WeeklyProgressChart data={analytics?.chartData || []} />

          {/* Upcoming Milestones */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold">Placement Milestones</h3>
              <Link to="/roadmap/milestones" className="text-xs font-semibold text-primary hover:underline">
                View All &rarr;
              </Link>
            </div>
            <div className="space-y-3">
              {milestones.slice(0, 2).map((m) => (
                <MilestoneCard key={m._id || m.id} milestone={m} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

