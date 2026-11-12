import React from 'react';
import { BookOpen, Lightbulb, Compass, Award, HelpCircle, RefreshCw } from 'lucide-react';

const MODES = [
  { id: 'explain', label: 'Explain', icon: BookOpen, desc: 'Concept breakdown & analogies' },
  { id: 'hint', label: 'Hint', icon: Lightbulb, desc: 'Progressive hints without spoiling' },
  { id: 'guided', label: 'Guided', icon: Compass, desc: 'Socratic step-by-step guidance' },
  { id: 'solution', label: 'Solution', icon: Award, desc: 'Full optimal walkthrough' },
  { id: 'quiz', label: 'Mini Quiz', icon: HelpCircle, desc: 'Quick check for understanding' },
  { id: 'review', label: 'Review', icon: RefreshCw, desc: 'Analyze past wrong attempts' },
];

export default function TutorModeSelector({ currentMode, onSelectMode, hintLevel, onSetHintLevel }) {
  return (
    <div className="flex flex-wrap items-center gap-2 pb-2">
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto max-w-full">
        {MODES.map((m) => {
          const Icon = m.icon;
          const isSelected = currentMode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onSelectMode(m.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isSelected
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title={m.desc}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {currentMode === 'hint' && (
        <div className="flex items-center gap-1 ml-auto text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/60 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
          <span>Hint Level:</span>
          {[1, 2, 3, 4].map((lvl) => (
            <button
              key={lvl}
              onClick={() => onSetHintLevel(lvl)}
              className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[11px] ${
                hintLevel === lvl
                  ? 'bg-amber-500 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

