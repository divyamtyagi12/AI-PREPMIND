import React from 'react';
import { Award, Calendar, CheckCircle2, Clock, Sparkles } from 'lucide-react';

export function RoadmapProgressCard({ roadmap, todayTasksCount = 0, pendingCount = 0 }) {
  if (!roadmap) return null;

  const {
    title,
    preparationGoal,
    targetDate,
    progressPercentage = 0,
    totalEstimatedMinutes = 0,
    completedMinutes = 0,
    isProvisional = false,
    status = 'active',
  } = roadmap;

  const targetDateObj = new Date(targetDate);
  const now = new Date();
  const daysRemaining = Math.max(0, Math.ceil((targetDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  const totalHours = Math.round(totalEstimatedMinutes / 60);
  const completedHours = Math.round(completedMinutes / 60);

  return (
    <div className="bg-card text-card-foreground rounded-2xl border p-5 sm:p-6 shadow-xs relative overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              {preparationGoal}
            </span>
            {isProvisional && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                <Sparkles className="w-3 h-3" /> Provisional Roadmap
              </span>
            )}
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                status === 'active'
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                  : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
              }`}
            >
              {status.toUpperCase()}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-muted-foreground block">Days Remaining</span>
            <span className="text-2xl font-black text-primary">{daysRemaining}</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Progress Bar & Details */}
      <div className="space-y-2 mb-5">
        <div className="flex justify-between items-baseline text-sm">
          <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Overall Completion
          </span>
          <span className="font-bold text-base">{progressPercentage}%</span>
        </div>
        <div className="w-full bg-secondary h-3 rounded-full overflow-hidden">
          <div
            className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, progressPercentage))}%` }}
          />
        </div>
      </div>

      {/* Grid of Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t text-sm">
        <div>
          <span className="text-xs text-muted-foreground block mb-0.5">Study Completed</span>
          <span className="font-bold text-foreground flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" /> {completedHours} / {totalHours} hrs
          </span>
        </div>
        <div>
          <span className="text-xs text-muted-foreground block mb-0.5">Today's Tasks</span>
          <span className="font-bold text-foreground">{todayTasksCount} scheduled</span>
        </div>
        <div>
          <span className="text-xs text-muted-foreground block mb-0.5">Pending Tasks</span>
          <span className="font-bold text-foreground">{pendingCount} remaining</span>
        </div>
        <div>
          <span className="text-xs text-muted-foreground block mb-0.5">Target Deadline</span>
          <span className="font-bold text-foreground">{targetDateObj.toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}

