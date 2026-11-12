import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle, Clock, Code, Play, RefreshCw, SkipForward } from 'lucide-react';
import { DifficultyBadge } from '../adaptive/DifficultyBadge';

const TYPE_STYLES = {
  learn: { label: 'Concept Study', icon: BookOpen, style: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' },
  practice: { label: 'Adaptive Practice', icon: Play, style: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  revision: { label: 'Spaced Revision', icon: RefreshCw, style: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  coding_practice: { label: 'Coding Practice', icon: Code, style: 'bg-violet-500/10 text-violet-600 border-violet-500/20' },
  assessment: { label: 'Assessment', icon: CheckCircle, style: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
};

export function StudyTaskCard({ task, onComplete, onSkip, onReschedule }) {
  if (!task) return null;

  const {
    _id,
    id = _id,
    title,
    description,
    taskType = 'learn',
    difficulty,
    estimatedMinutes = 30,
    status = 'pending',
    topicId,
    linkedRoute,
  } = task;

  const topicName = typeof topicId === 'object' && topicId ? topicId.name : null;
  const typeConfig = TYPE_STYLES[taskType] || TYPE_STYLES.learn;
  const Icon = typeConfig.icon;

  const isDone = status === 'completed';
  const isSkipped = status === 'skipped';

  return (
    <div
      className={`rounded-xl border p-4.5 transition-all shadow-xs flex flex-col justify-between ${
        isDone
          ? 'bg-muted/40 border-border opacity-75'
          : isSkipped
          ? 'bg-muted/20 border-border opacity-50'
          : 'bg-card text-card-foreground hover:shadow-md'
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${typeConfig.style}`}
            >
              <Icon className="w-3 h-3" /> {typeConfig.label}
            </span>
            {difficulty && <DifficultyBadge difficulty={difficulty} />}
          </div>
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> {estimatedMinutes} min
          </span>
        </div>

        {topicName && (
          <span className="text-xs font-bold text-primary/80 uppercase tracking-wider block mb-1">
            {topicName}
          </span>
        )}

        <h4 className={`text-base font-bold tracking-tight mb-1.5 ${isDone ? 'line-through text-muted-foreground' : ''}`}>
          {title}
        </h4>

        {description && (
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-3">
            {description}
          </p>
        )}
      </div>

      <div className="pt-3 border-t flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          {linkedRoute && !isDone && !isSkipped && (
            <Link
              to={linkedRoute}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-xs"
            >
              <Play className="w-3 h-3 fill-current" /> Start
            </Link>
          )}

          {!isDone && !isSkipped && onComplete && (
            <button
              type="button"
              onClick={() => onComplete(id)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 transition"
            >
              <CheckCircle className="w-3 h-3" /> Mark Done
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 text-xs">
          {!isDone && !isSkipped && onSkip && (
            <button
              type="button"
              onClick={() => onSkip(id)}
              className="text-muted-foreground hover:text-foreground px-2 py-1 rounded transition inline-flex items-center gap-1"
            >
              <SkipForward className="w-3 h-3" /> Skip
            </button>
          )}

          {isDone && (
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 text-xs">
              <CheckCircle className="w-3.5 h-3.5" /> Completed
            </span>
          )}

          {isSkipped && (
            <span className="text-muted-foreground text-xs italic">
              Skipped
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

