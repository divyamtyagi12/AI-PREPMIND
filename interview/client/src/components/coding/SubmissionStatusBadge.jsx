import React from 'react';
import { CheckCircle2, XCircle, Clock, AlertTriangle, ShieldAlert } from 'lucide-react';

export default function SubmissionStatusBadge({ verdict, passedCount, totalCount }) {
  if (!verdict) return null;

  switch (verdict) {
    case 'accepted':
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-700 dark:text-emerald-300 font-bold text-xs">
          <CheckCircle2 className="h-4 w-4" />
          <span>Accepted</span>
          {totalCount > 0 && <span className="font-normal font-mono text-[11px]">({passedCount}/{totalCount})</span>}
        </div>
      );
    case 'wrong_answer':
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-300 font-bold text-xs">
          <XCircle className="h-4 w-4" />
          <span>Wrong Answer</span>
          {totalCount > 0 && <span className="font-normal font-mono text-[11px]">({passedCount}/{totalCount})</span>}
        </div>
      );
    case 'compilation_error':
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-700 dark:text-amber-300 font-bold text-xs">
          <AlertTriangle className="h-4 w-4" />
          <span>Compilation Error</span>
        </div>
      );
    case 'time_limit_exceeded':
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-700 dark:text-amber-300 font-bold text-xs">
          <Clock className="h-4 w-4" />
          <span>Time Limit Exceeded</span>
        </div>
      );
    case 'system_error':
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-bold text-xs">
          <ShieldAlert className="h-4 w-4" />
          <span>System Error</span>
        </div>
      );
    default:
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-semibold text-xs uppercase">
          <span>{verdict.replace('_', ' ')}</span>
        </div>
      );
  }
}

