import React from 'react';
import { HelpCircle, Sparkles, Tag } from 'lucide-react';

export default function InterviewQuestionCard({ question, currentOrder, totalQuestions, isFollowUp }) {
  if (!question) return null;

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-full">
            Question {currentOrder} of {totalQuestions}
          </span>
          {isFollowUp && (
            <span className="flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-semibold text-xs rounded-full border border-amber-200 dark:border-amber-800">
              <Sparkles className="h-3 w-3" />
              Adaptive Follow-Up
            </span>
          )}
        </div>
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {question.questionType}
        </span>
      </div>

      <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
        {question.questionText}
      </h2>

      {question.expectedCompetencies?.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] text-slate-400">Target Competencies:</span>
          {question.expectedCompetencies.map((comp, idx) => (
            <span
              key={idx}
              className="text-[11px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md font-medium"
            >
              {comp}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

