import React from 'react';
import { AlertTriangle, Clock, Calendar, ArrowRight } from 'lucide-react';

export function RoadmapFeasibilityAlert({ feasibility, onAdjustScope, onExtendDeadline }) {
  if (!feasibility || feasibility.isFeasible) return null;

  const {
    availableMinutes = 0,
    requiredMinutes = 0,
    shortfallMinutes = 0,
    suggestedDeadlineExtensionDays = 0,
    suggestedDailyIncreaseMinutes = 0,
    warningMessage,
  } = feasibility;

  const availableHours = Math.round(availableMinutes / 60);
  const requiredHours = Math.round(requiredMinutes / 60);
  const shortfallHours = Math.round(shortfallMinutes / 60);

  return (
    <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-5 shadow-xs mb-6">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-base text-rose-600 dark:text-rose-400">
            Workload Exceeds Capacity Warning
          </h4>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {warningMessage ||
              `Your selected preparation schedule allows ${availableHours} hours, but full topic coverage requires approximately ${requiredHours} hours (shortfall of ${shortfallHours} hours).`}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div className="bg-card p-3 rounded-xl border text-xs">
              <span className="font-semibold block mb-0.5">Option A: Extend Target Date</span>
              <span className="text-muted-foreground">
                Add +{suggestedDeadlineExtensionDays} days to comfortably finish all topics.
              </span>
            </div>
            <div className="bg-card p-3 rounded-xl border text-xs">
              <span className="font-semibold block mb-0.5">Option B: Increase Daily Study Time</span>
              <span className="text-muted-foreground">
                Increase daily study time by +{suggestedDailyIncreaseMinutes} minutes.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

