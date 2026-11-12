import React from 'react';
import { Award, CheckCircle2, Clock } from 'lucide-react';

export function MilestoneCard({ milestone }) {
  if (!milestone) return null;

  const {
    title,
    description,
    targetDate,
    completionCriteria,
    status = 'pending',
    completionDate,
  } = milestone;

  const isDone = status === 'completed';
  const targetDateObj = new Date(targetDate);

  return (
    <div
      className={`rounded-2xl border p-5 shadow-xs transition-all flex flex-col justify-between ${
        isDone ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-card text-card-foreground'
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                isDone ? 'bg-emerald-500 text-white' : 'bg-primary/10 text-primary'
              }`}
            >
              <Award className="w-4 h-4" />
            </div>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                isDone
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                  : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
              }`}
            >
              {isDone ? 'COMPLETED' : 'UPCOMING'}
            </span>
          </div>

          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Target: {targetDateObj.toLocaleDateString()}
          </span>
        </div>

        <h4 className="text-base font-bold tracking-tight mb-1">{title}</h4>
        {description && <p className="text-xs text-muted-foreground mb-3">{description}</p>}

        <div className="bg-secondary/50 rounded-xl p-3 border text-xs text-muted-foreground">
          <strong className="text-foreground block mb-0.5">Verification Criteria:</strong>
          {completionCriteria}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs">
        {isDone ? (
          <span className="text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> Achieved on {new Date(completionDate || targetDate).toLocaleDateString()}
          </span>
        ) : (
          <span className="text-muted-foreground italic">In progress toward milestone target</span>
        )}
      </div>
    </div>
  );
}

