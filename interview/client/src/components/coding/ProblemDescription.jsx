import React from 'react';
import { Tag, Clock, Database, ExternalLink } from 'lucide-react';

export default function ProblemDescription({ problem }) {
  if (!problem) return null;

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-200">
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              problem.difficulty === 'Easy'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                : problem.difficulty === 'Medium'
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
            }`}
          >
            {problem.difficulty}
          </span>
          {problem.topicIds?.map((t) => (
            <span
              key={t.id || t._id}
              className="flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-xs"
            >
              <Tag className="h-3 w-3" />
              {t.name}
            </span>
          ))}
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">{problem.title}</h1>
      </div>

      <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed text-sm">
        {problem.description}
      </div>

      {/* Examples */}
      {problem.examples?.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Examples</h3>
          {problem.examples.map((ex, idx) => (
            <div
              key={idx}
              className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono space-y-1.5"
            >
              <p className="font-bold text-slate-700 dark:text-slate-300">Example {idx + 1}:</p>
              <div>
                <span className="text-slate-500 font-sans">Input: </span>
                <span className="text-slate-800 dark:text-slate-200">{ex.input}</span>
              </div>
              <div>
                <span className="text-slate-500 font-sans">Output: </span>
                <span className="text-slate-800 dark:text-slate-200">{ex.output}</span>
              </div>
              {ex.explanation && (
                <div className="text-slate-500 font-sans pt-1">
                  <span>Explanation: </span>
                  {ex.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Constraints */}
      {problem.constraints?.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Constraints</h3>
          <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600 dark:text-slate-400 font-mono">
            {problem.constraints.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-4 text-xs text-slate-400 pt-4 border-t border-slate-200 dark:border-slate-800">
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          Time Limit: {problem.timeLimitMs || 2000}ms
        </span>
        <span className="flex items-center gap-1">
          <Database className="h-3.5 w-3.5" />
          Memory Limit: {Math.round((problem.memoryLimitKb || 262144) / 1024)}MB
        </span>
      </div>
    </div>
  );
}

