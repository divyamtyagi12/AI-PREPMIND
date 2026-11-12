import React, { useState } from 'react';
import { CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

export default function TestCasePanel({ testCases = [], results = [], compileOutput }) {
  const [activeTab, setActiveTab] = useState(0);

  if (compileOutput) {
    return (
      <div className="p-4 bg-slate-900 border border-rose-900/50 rounded-xl font-mono text-xs text-rose-400 space-y-2">
        <div className="flex items-center gap-1.5 font-bold text-rose-300">
          <AlertCircle className="h-4 w-4" />
          Compilation Error:
        </div>
        <pre className="whitespace-pre-wrap leading-relaxed overflow-x-auto text-[11px]">
          {compileOutput}
        </pre>
      </div>
    );
  }

  const cases = results.length > 0 ? results : testCases;
  if (!cases || cases.length === 0) return null;

  const currentCase = cases[activeTab] || cases[0];

  return (
    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
      {/* Case Tabs */}
      <div className="flex items-center gap-1 p-2 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        {cases.map((c, idx) => {
          const isPassed = c.status === 'accepted';
          const isFailed = c.status && c.status !== 'accepted';

          return (
            <button
              key={idx}
              onClick={() => setActiveTab(idx)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === idx
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isPassed && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
              {isFailed && <XCircle className="h-3.5 w-3.5 text-rose-500" />}
              <span>Case {idx + 1}</span>
            </button>
          );
        })}
      </div>

      {/* Case Details */}
      <div className="p-4 space-y-3 font-mono">
        {currentCase.status && (
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <span
              className={`font-bold uppercase text-[11px] ${
                currentCase.status === 'accepted' ? 'text-emerald-500' : 'text-rose-500'
              }`}
            >
              {currentCase.status.replace('_', ' ')}
            </span>
            {currentCase.executionTimeMs !== undefined && (
              <span className="text-[11px] text-slate-400">
                {currentCase.executionTimeMs}ms
              </span>
            )}
          </div>
        )}

        <div>
          <span className="text-[11px] font-sans text-slate-400 block mb-1">Input:</span>
          <pre className="p-2.5 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 overflow-x-auto">
            {currentCase.input}
          </pre>
        </div>

        <div>
          <span className="text-[11px] font-sans text-slate-400 block mb-1">Expected Output:</span>
          <pre className="p-2.5 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 overflow-x-auto">
            {currentCase.expectedOutput}
          </pre>
        </div>

        {currentCase.actualOutput !== undefined && (
          <div>
            <span className="text-[11px] font-sans text-slate-400 block mb-1">Actual Output:</span>
            <pre className="p-2.5 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 overflow-x-auto">
              {currentCase.actualOutput || '(no output)'}
            </pre>
          </div>
        )}

        {currentCase.errorMessage && (
          <div>
            <span className="text-[11px] font-sans text-rose-400 block mb-1">Error / Stderr:</span>
            <pre className="p-2.5 bg-rose-950/20 rounded-lg border border-rose-900/40 text-rose-400 overflow-x-auto">
              {currentCase.errorMessage}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

