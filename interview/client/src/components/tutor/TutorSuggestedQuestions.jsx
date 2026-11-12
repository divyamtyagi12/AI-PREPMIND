import React from 'react';
import { Sparkles } from 'lucide-react';

export default function TutorSuggestedQuestions({ suggestions = [], onSelect }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      <div className="flex items-center gap-1 text-xs text-slate-400">
        <Sparkles className="h-3 w-3 text-indigo-400" />
        <span>Suggestions:</span>
      </div>
      {suggestions.map((q, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(q)}
          className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors border border-slate-200 dark:border-slate-700 text-left"
        >
          {q}
        </button>
      ))}
    </div>
  );
}

