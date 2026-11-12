import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, Clock, RefreshCw } from 'lucide-react';

export function RevisionReminderCard({ dueRevisions = [] }) {
  if (!dueRevisions || dueRevisions.length === 0) return null;

  return (
    <div className="bg-amber-500/10 border border-amber-500/20 text-card-foreground rounded-2xl p-5 shadow-xs mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-base text-foreground">
                Spaced Revision Due ({dueRevisions.length})
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white">
                Memory Reinforcement
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Reinforce knowledge for topics where retention is due to decay.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {dueRevisions.slice(0, 4).map((rev) => {
                const topicName = rev.topicId?.name || 'Topic';
                return (
                  <span
                    key={rev._id || rev.id}
                    className="text-xs font-semibold px-2 py-0.5 rounded-md bg-card border border-border"
                  >
                    {topicName}
                  </span>
                );
              })}
              {dueRevisions.length > 4 && (
                <span className="text-xs text-muted-foreground self-center">
                  +{dueRevisions.length - 4} more
                </span>
              )}
            </div>
          </div>
        </div>

        <Link
          to="/adaptive"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition shadow-xs shrink-0"
        >
          Review Now <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

