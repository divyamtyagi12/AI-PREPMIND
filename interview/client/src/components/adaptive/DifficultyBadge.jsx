import React from 'react';

const DIFFICULTY_STYLES = {
  Easy: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  Medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  Hard: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
};

export function DifficultyBadge({ difficulty = 'Medium', className = '' }) {
  const style = DIFFICULTY_STYLES[difficulty] || DIFFICULTY_STYLES.Medium;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style} ${className}`}
    >
      {difficulty}
    </span>
  );
}

