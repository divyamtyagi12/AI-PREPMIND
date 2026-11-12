import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Pause,
  Play,
  PlusCircle,
  RefreshCw,
  Save,
  Settings,
  Sparkles,
} from 'lucide-react';
import {
  getActiveRoadmap,
  updateRoadmapSettings,
  pauseRoadmap,
  resumeRoadmap,
  replanRoadmap,
} from '../../services/roadmapService';

export default function RoadmapSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [roadmap, setRoadmap] = useState(null);
  const [saving, setSaving] = useState(false);
  const [replanning, setReplanning] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [weeklyAvailability, setWeeklyAvailability] = useState({
    monday: 60,
    tuesday: 60,
    wednesday: 60,
    thursday: 60,
    friday: 60,
    saturday: 120,
    sunday: 120,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const active = await getActiveRoadmap();
      if (active?.roadmap) {
        setRoadmap(active.roadmap);
        setTitle(active.roadmap.title || '');
        setTargetDate(new Date(active.roadmap.targetDate).toISOString().split('T')[0]);
        if (active.roadmap.weeklyAvailability) {
          setWeeklyAvailability(active.roadmap.weeklyAvailability);
        }
      }
    } catch (err) {
      toast.error('Failed to load roadmap settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleWeekdayChange = (day, val) => {
    const num = Math.max(0, Math.min(480, parseInt(val, 10) || 0));
    setWeeklyAvailability((prev) => ({ ...prev, [day]: num }));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!roadmap) return;

    setSaving(true);
    try {
      await updateRoadmapSettings(roadmap.id || roadmap._id, {
        title,
        targetDate: new Date(targetDate).toISOString(),
        weeklyAvailability,
      });

      // Automatically trigger schedule adjustment with new availability
      await replanRoadmap(roadmap.id || roadmap._id, {
        reason: 'Student modified study settings and schedule availability',
        force: true,
        newTargetDate: new Date(targetDate).toISOString(),
        newWeeklyAvailability: weeklyAvailability,
      });

      toast.success('Roadmap settings updated and schedule synchronized!');
      navigate('/roadmap');
    } catch (err) {
      toast.error('Failed to update roadmap settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePause = async () => {
    if (!roadmap) return;
    try {
      if (roadmap.status === 'active') {
        await pauseRoadmap(roadmap.id || roadmap._id);
        toast.info('Roadmap paused');
      } else {
        await resumeRoadmap(roadmap.id || roadmap._id);
        toast.success('Roadmap resumed');
      }
      loadData();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleTriggerReplan = async () => {
    if (!roadmap) return;
    setReplanning(true);
    try {
      await replanRoadmap(roadmap.id || roadmap._id, {
        reason: 'Student manually triggered full synchronization',
        force: true,
      });
      toast.success('Roadmap synchronized and replanned successfully!');
      loadData();
    } catch (err) {
      toast.error('Failed to replan roadmap');
    } finally {
      setReplanning(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center text-sm text-muted-foreground">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading settings...
      </div>
    );
  }

  if (!roadmap) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <h3 className="text-lg font-bold mb-2">No Active Roadmap</h3>
        <Link to="/roadmap/setup" className="text-xs font-bold text-primary hover:underline">
          Setup New Roadmap &rarr;
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
      <div>
        <Link
          to="/roadmap"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-2 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Roadmap Overview
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Roadmap Settings & Adjustments</h1>
        <p className="text-xs text-muted-foreground">
          Modify study parameters, target completion deadlines, or trigger schedule synchronization.
        </p>
      </div>

      {/* Quick Action Bar */}
      <div className="bg-card p-4 rounded-2xl border shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
              roadmap.status === 'active'
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
            }`}
          >
            STATUS: {roadmap.status.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTogglePause}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border hover:bg-secondary transition"
          >
            {roadmap.status === 'active' ? (
              <>
                <Pause className="w-3.5 h-3.5" /> Pause Roadmap
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" /> Resume Roadmap
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleTriggerReplan}
            disabled={replanning}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border hover:bg-secondary transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${replanning ? 'animate-spin' : ''}`} />
            {replanning ? 'Replanning...' : 'Replan Tasks'}
          </button>
        </div>
      </div>

      {/* Form Settings */}
      <form onSubmit={handleSaveSettings} className="space-y-5 bg-card p-6 rounded-2xl border shadow-xs">
        <div>
          <label className="text-xs font-bold text-muted-foreground block mb-1">
            Roadmap Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-background border rounded-lg px-3 py-2 text-sm font-semibold"
            required
          />
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground block mb-1">
            Target Completion Date
          </label>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            min={new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]}
            className="w-full bg-background border rounded-lg px-3 py-2 text-sm font-semibold"
            required
          />
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground block mb-2">
            Weekly Availability (Minutes Per Day)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {Object.entries(weeklyAvailability).map(([day, val]) => (
              <div key={day} className="bg-secondary/40 p-2.5 rounded-xl border">
                <span className="text-[11px] font-semibold capitalize text-muted-foreground block mb-1">
                  {day}
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="480"
                    step="15"
                    value={val}
                    onChange={(e) => handleWeekdayChange(day, e.target.value)}
                    className="w-full bg-background border rounded-md px-2 py-1 text-xs font-bold text-center"
                  />
                  <span className="text-[10px] text-muted-foreground">min</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t flex items-center justify-between">
          <Link
            to="/roadmap/setup"
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Start New Roadmap Setup
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save & Replan'}
          </button>
        </div>
      </form>
    </div>
  );
}

