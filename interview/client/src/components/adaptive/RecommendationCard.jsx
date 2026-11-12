import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle2, Sparkles, Target } from 'lucide-react';

const PRIORITY_BADGES = {
  high: { label: 'High Priority', style: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
  medium: { label: 'Medium Priority', style: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  low: { label: 'Recommended', style: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
};

export function RecommendationCard({ recommendation }) {
  const {
    topicName,
    subjectName,
    priority = 'medium',
    reason,
    suggestedAction = 'Start Practice',
    relatedRoute = '/adaptive/setup',
    currentMastery,
  } = recommendation;

  const badge = PRIORITY_BADGES[priority] || PRIORITY_BADGES.medium;

  return (
    <div className="bg-card text-card-foreground rounded-xl border p-5 shadow-xs transition hover:shadow-md flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.style}`}>
            {badge.label}
          </span>
          {currentMastery !== null && currentMastery !== undefined && (
            <span className="text-xs font-bold text-muted-foreground">
              Mastery: {Math.round(currentMastery * 100)}%
            </span>
          )}
        </div>

        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
          {subjectName}
        </div>
        <h4 className="text-lg font-bold tracking-tight mb-2">{topicName}</h4>

        <p className="text-sm text-muted-foreground leading-relaxed">
          {reason}
        </p>
      </div>

      <div className="mt-5 pt-4 border-t flex justify-end">
        <Link
          to={relatedRoute}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5" /> {suggestedAction} <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

