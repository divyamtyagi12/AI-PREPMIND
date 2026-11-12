import React from 'react';
import { BrainCircuit, CheckCircle2, Flag } from 'lucide-react';

export function AdaptiveSessionProgress({
  scopeTitle = 'Adaptive Practice',
  currentQuestionIndex = 1,
  maxQuestions = 5,
  correctCount = 0,
  answeredCount = 0,
  onEndSession,
}) {
  const progressPct = maxQuestions > 0 ? Math.round((answeredCount / maxQuestions) * 100) : 0;

  return (
    <div className="bg-card text-card-foreground rounded-2xl border p-4 sm:p-5 shadow-xs mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
            <BrainCircuit className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight">{scopeTitle}</h2>
            <span className="text-xs text-muted-foreground">Adaptive Learning Session</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Progress</div>
            <div className="text-sm font-bold">
              Question {currentQuestionIndex} of {maxQuestions}
            </div>
          </div>
          <div className="text-right pl-4 border-l">
            <div className="text-xs text-muted-foreground">Score</div>
            <div className="text-sm font-bold text-emerald-600 flex items-center gap-1 justify-end">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {correctCount} / {answeredCount}
            </div>
          </div>
          {onEndSession && (
            <button
              onClick={onEndSession}
              type="button"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-secondary transition ml-2 inline-flex items-center gap-1"
            >
              <Flag className="w-3 h-3" /> End
            </button>
          )}
        </div>
      </div>

      <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
        <div
          className="bg-primary h-full rounded-full transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  );
}

