import React from 'react';
import { Link } from 'react-router-dom';
import { BrainCircuit, ChevronRight, Sparkles, TrendingUp } from 'lucide-react';

const CLASSIFICATION_STYLES = {
  Beginner: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  Developing: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  Proficient: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  Strong: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  'Not Yet Assessed': 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
};

const EVIDENCE_STYLES = {
  'Sufficient Evidence': 'text-emerald-600 dark:text-emerald-400',
  'Insufficient Evidence': 'text-amber-600 dark:text-amber-400',
  'Not Yet Assessed': 'text-slate-500 dark:text-slate-400',
};

export function MasteryCard({ topic }) {
  const {
    topicId,
    topicName,
    subjectName,
    categoryName,
    masteryProbability,
    masteryClassification = 'Not Yet Assessed',
    evidenceLevel = 'Not Yet Assessed',
    observationsProcessed = 0,
  } = topic;

  const hasMastery = masteryProbability !== null && masteryProbability !== undefined;
  const percentage = hasMastery ? Math.round(masteryProbability * 100) : 0;
  const classStyle = CLASSIFICATION_STYLES[masteryClassification] || CLASSIFICATION_STYLES['Not Yet Assessed'];

  return (
    <div className="bg-card text-card-foreground rounded-xl border p-5 shadow-xs transition hover:shadow-md flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              {subjectName || categoryName || 'Topic'}
            </div>
            <h3 className="text-lg font-semibold tracking-tight">{topicName}</h3>
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${classStyle}`}
          >
            {masteryClassification}
          </span>
        </div>

        {/* Mastery Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between items-baseline text-xs mb-1.5">
            <span className="font-medium text-muted-foreground">Estimated Mastery:</span>
            <span className="font-bold text-sm">
              {hasMastery ? `${percentage}%` : '—'}
            </span>
          </div>
          <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                percentage >= 85
                  ? 'bg-emerald-500'
                  : percentage >= 70
                  ? 'bg-blue-500'
                  : percentage >= 40
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Evidence Status */}
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>Evidence: <strong className={EVIDENCE_STYLES[evidenceLevel] || 'text-slate-500'}>{evidenceLevel}</strong></span>
          <span>{observationsProcessed} observation{observationsProcessed === 1 ? '' : 's'}</span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-5 pt-4 border-t flex items-center justify-between gap-3">
        <Link
          to={`/mastery/${topicId}`}
          className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
        >
          <TrendingUp className="w-3.5 h-3.5" /> Learning Curve
        </Link>
        <Link
          to={`/adaptive/setup?topicId=${topicId}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5" /> Practice
        </Link>
      </div>
    </div>
  );
}

